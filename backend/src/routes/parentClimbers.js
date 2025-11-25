import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { validateCreateClimber, validateUpdateClimber } from '../middleware/validation/parentClimbersValidation.js';
import { validateActivateClimber } from '../middleware/validation/climberActivationValidation.js';
import {
  createClimberForParent,
  updateClimberForParent,
  deactivateClimberForParent,
  deleteClimberForParent,
  getClimbersForParent,
  linkExistingChildToParent,
  checkClimberRelatedData,
} from '../services/parentClimberService.js';
import { activateClimberProfile } from '../services/climberActivationService.js';
import { isClimberLinkedToParent, removeLink } from '../services/parentClimberLinkService.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// All routes require authentication and climber role
// Climbers can access these routes to manage their own profile and linked children
router.use(authenticate);
// Debug middleware to log user info before role check
router.use((req, res, next) => {
  logger.info({
    userId: req.user?.id,
    email: req.user?.email,
    roles: req.user?.roles,
    rolesType: typeof req.user?.roles,
    rolesIsArray: Array.isArray(req.user?.roles),
    path: req.path,
    method: req.method,
  }, 'Before role check');
  next();
});
router.use(requireRole('admin', 'climber'));

/**
 * GET /api/v1/parents/me/climbers
 * Get all climbers linked to the authenticated parent
 * Admin users will get an empty array (they can use /admin/climbers for all climbers)
 */
router.get('/me/climbers', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRoles = req.user.roles || [];
    
    logger.info({ 
      userId, 
      userRoles,
      hasAdminRole: userRoles.includes('admin')
    }, 'GET /me/climbers - fetching climbers');
    
    // Admin users don't have linked climbers, return empty array
    if (userRoles.includes('admin') && !userRoles.includes('climber')) {
      logger.info({ userId }, 'Admin user without climber role - returning empty array');
      return res.json({ climbers: [] });
    }
    
    const climbers = await getClimbersForParent(userId);
    logger.info({ 
      userId, 
      climbersCount: climbers.length,
      climberIds: climbers.map(c => c._id?.toString())
    }, 'GET /me/climbers - climbers fetched');
    
    res.json({ climbers });
  } catch (error) {
    logger.error({ error, userId: req.user.id }, 'Error fetching climbers for parent');
    next(error);
  }
});

/**
 * POST /api/v1/parents/me/climbers
 * Create a new child User and link it to the authenticated parent
 * Returns duplicate info if profile already exists
 */
router.post('/me/climbers', validateCreateClimber, async (req, res, next) => {
  try {
    const parentId = req.user.id;
    
    logger.info({
      parentId,
      path: req.path,
    }, 'Creating child for parent');
    
    const result = await createClimberForParent(parentId, req.body);
    
    // If duplicate found, return 200 with duplicate info
    if (result.duplicate) {
      return res.status(200).json({
        duplicate: true,
        existingProfile: result.existingProfile,
        message: result.message,
      });
    }
    
    // New child created
    res.status(201).json({ 
      duplicate: false,
      child: result.child,
      message: 'Child created successfully'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
          existingProfile: error.existingProfile,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/parents/me/climbers/:climberId
 * Get a specific climber (only if linked to parent)
 */
router.get('/me/climbers/:climberId', async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { climberId } = req.params;

    const isLinked = await isClimberLinkedToParent(parentId, climberId);
    if (!isLinked) {
      return res.status(404).json({
        error: {
          message: 'Climber not found or not linked to this parent',
        },
      });
    }

    const climbers = await getClimbersForParent(parentId);
    const climber = climbers.find(c => c._id.toString() === climberId);

    if (!climber) {
      return res.status(404).json({
        error: {
          message: 'Climber not found',
        },
      });
    }

    res.json({ climber });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/parents/me/climbers/:climberId
 * Update a climber (only if linked to parent)
 */
router.put('/me/climbers/:climberId', validateUpdateClimber, async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { climberId } = req.params;
    const climber = await updateClimberForParent(parentId, climberId, req.body);
    res.json({ climber });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/parents/me/climbers/:climberId/check-deletion
 * Check for related data before deletion (bookings, attendance, etc.)
 */
router.get('/me/climbers/:climberId/check-deletion', async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { climberId } = req.params;

    // Verify ownership
    const isLinked = await isClimberLinkedToParent(parentId, climberId);
    if (!isLinked) {
      return res.status(404).json({
        error: {
          message: 'Climber not found or not linked to this parent',
        },
      });
    }

    const relatedData = await checkClimberRelatedData(climberId);
    res.json(relatedData);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/parents/me/climbers/:climberId
 * Delete a child (remove link and delete User if inactive account)
 */
router.delete('/me/climbers/:climberId', async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { climberId } = req.params;
    const result = await deleteClimberForParent(parentId, climberId);
    res.json({ message: result.message || 'Child deleted successfully' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/parents/me/climbers/:childId/activate
 * Activate a child account by adding email and password
 */
router.post('/me/climbers/:childId/activate', validateActivateClimber, async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;
    const { email, password, middleName, phone } = req.body;

    // Verify ownership
    const isLinked = await isClimberLinkedToParent(parentId, childId);
    if (!isLinked) {
      return res.status(404).json({
        error: {
          message: 'Child not found or not linked to this parent',
        },
      });
    }

    const updateData = {};
    if (middleName !== undefined) updateData.middleName = middleName;
    if (phone !== undefined) updateData.phone = phone;

    const user = await activateClimberProfile(childId, email, password, parentId, updateData);
    
    res.json({
      user,
      message: 'Child profile activated successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/parents/me/climbers/:childId/link-existing
 * Link an existing child profile to parent
 */
router.post('/me/climbers/:childId/link-existing', async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;

    const child = await linkExistingChildToParent(parentId, childId);
    
    res.json({
      child,
      message: 'Child profile linked successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/parents/me/climbers/:childId/link
 * Remove ParentClimberLink (manual removal)
 * Only allowed if child has userId (is activated)
 */
router.delete('/me/climbers/:childId/link', async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;

    // Verify ownership
    const isLinked = await isClimberLinkedToParent(parentId, childId);
    if (!isLinked) {
      return res.status(404).json({
        error: {
          message: 'Child not found or not linked to this parent',
        },
      });
    }

    // Check if child is activated (has email/password)
    const { User } = await import('../models/user.js');
    const child = await User.findById(childId);
    if (!child || !child.email) {
      return res.status(400).json({
        error: {
          message: 'Cannot remove link for inactive child account',
        },
      });
    }

    const removed = await removeLink(parentId, childId);
    if (!removed) {
      return res.status(404).json({
        error: {
          message: 'Link not found',
        },
      });
    }

    res.json({
      message: 'Parent-child link removed successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

export default router;

