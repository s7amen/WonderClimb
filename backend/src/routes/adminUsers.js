import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { User } from '../models/user.js';
import { ParentClimberLink } from '../models/parentClimberLink.js';
import { validateCreateClimber } from '../middleware/validation/parentClimbersValidation.js';
import { validateActivateClimber } from '../middleware/validation/climberActivationValidation.js';
import { activateClimberProfile } from '../services/climberActivationService.js';
import logger from '../middleware/logging.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/admin/users
 * Get list of users, optionally filtered by role
 * Accessible to: admin, coach, instructor
 * Example: /api/v1/admin/users?role=coach
 */
router.get('/users', requireRole('admin', 'coach', 'instructor'), async (req, res, next) => {
  try {
    const { role } = req.query;

    const query = {};
    if (role) {
      query.roles = { $in: [role] };
    }

    const users = await User.find(query)
      .select('_id firstName middleName lastName email roles phone accountStatus isTrainee dateOfBirth notes photo photoHistory clubMembership createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      users: users.map(user => ({
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || '',
        roles: user.roles,
        accountStatus: user.accountStatus,
        isTrainee: user.isTrainee !== undefined ? user.isTrainee : false,
        dateOfBirth: user.dateOfBirth,
        notes: user.notes || '',
        photo: user.photo,
        photoHistory: user.photoHistory || [],
        clubMembership: user.clubMembership || { isCurrentMember: false, membershipHistory: [] },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get a specific user by ID
 * Accessible to: admin, coach, instructor
 */
router.get('/users/:id', requireRole('admin', 'coach', 'instructor'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('_id firstName middleName lastName email roles phone accountStatus isTrainee dateOfBirth notes photo photoHistory clubMembership createdAt updatedAt')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    res.json({
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || '',
        roles: user.roles,
        accountStatus: user.accountStatus,
        isTrainee: user.isTrainee !== undefined ? user.isTrainee : false,
        dateOfBirth: user.dateOfBirth,
        notes: user.notes || '',
        photo: user.photo,
        photoHistory: user.photoHistory || [],
        clubMembership: user.clubMembership || { isCurrentMember: false, membershipHistory: [] },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/admin/users/:id
 * Update user data (name, email, phone)
 * Accessible to: admin only
 */
router.put('/users/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, email, phone, dateOfBirth, notes, accountStatus, isTrainee } = req.body;
    const updateData = {};

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length < 1) {
        return res.status(400).json({
          error: {
            message: 'firstName must be a string with at least 1 character',
          },
        });
      }
      updateData.firstName = firstName.trim();
    }

    if (middleName !== undefined) {
      if (middleName !== null && typeof middleName !== 'string') {
        return res.status(400).json({
          error: {
            message: 'middleName must be a string or null',
          },
        });
      }
      updateData.middleName = middleName ? middleName.trim() : null;
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length < 1) {
        return res.status(400).json({
          error: {
            message: 'lastName must be a string with at least 1 character',
          },
        });
      }
      updateData.lastName = lastName.trim();
    }

    if (email !== undefined) {
      // Allow null or empty string for children without email
      if (email === null || email === '') {
        updateData.email = null;
      } else {
        if (typeof email !== 'string') {
          return res.status(400).json({
            error: {
              message: 'Email must be a string',
            },
          });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: {
              message: 'Email must be a valid email address',
            },
          });
        }
        // Check if email already exists for another user
        const existingUser = await User.findOne({ 
          email: email.toLowerCase().trim(),
          _id: { $ne: req.params.id }
        });
        if (existingUser) {
          return res.status(409).json({
            error: {
              message: 'Email already exists',
            },
          });
        }
        updateData.email = email.toLowerCase().trim();
      }
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : '';
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth !== null && dateOfBirth !== '') {
        const date = new Date(dateOfBirth);
        if (isNaN(date.getTime())) {
          return res.status(400).json({
            error: {
              message: 'dateOfBirth must be a valid date',
            },
          });
        }
        updateData.dateOfBirth = date;
      } else {
        updateData.dateOfBirth = null;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes ? notes.trim() : '';
    }

    if (accountStatus !== undefined) {
      if (!['active', 'inactive'].includes(accountStatus)) {
        return res.status(400).json({
          error: {
            message: 'accountStatus must be "active" or "inactive"',
          },
        });
      }
      updateData.accountStatus = accountStatus;
    }

    if (isTrainee !== undefined) {
      if (typeof isTrainee !== 'boolean') {
        return res.status(400).json({
          error: {
            message: 'isTrainee must be a boolean',
          },
        });
      }
      updateData.isTrainee = isTrainee;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('_id firstName middleName lastName email roles phone accountStatus isTrainee dateOfBirth notes photo photoHistory clubMembership createdAt updatedAt').lean();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    logger.info({ 
      userId: req.user.id, 
      updatedUserId: req.params.id,
      changes: updateData 
    }, 'User data updated by admin');

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || '',
        roles: user.roles,
        accountStatus: user.accountStatus,
        isTrainee: user.isTrainee !== undefined ? user.isTrainee : false,
        dateOfBirth: user.dateOfBirth,
        notes: user.notes || '',
        photo: user.photo,
        photoHistory: user.photoHistory || [],
        clubMembership: user.clubMembership || { isCurrentMember: false, membershipHistory: [] },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message),
        },
      });
    }
    next(error);
  }
});

/**
 * PUT /api/v1/admin/users/:id/roles
 * Update user roles
 * Accessible to: admin only
 */
router.put('/users/:id/roles', requireRole('admin'), async (req, res, next) => {
  try {
    const { roles } = req.body;

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({
        error: {
          message: 'Roles must be an array',
        },
      });
    }

    if (roles.length === 0) {
      return res.status(400).json({
        error: {
          message: 'User must have at least one role',
        },
      });
    }

    const validRoles = ['admin', 'coach', 'climber', 'instructor'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: {
          message: `Invalid roles: ${invalidRoles.join(', ')}`,
        },
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { roles },
      { new: true, runValidators: true }
    ).select('_id firstName middleName lastName email roles phone accountStatus isTrainee dateOfBirth notes photo photoHistory clubMembership createdAt updatedAt').lean();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
        },
      });
    }

    logger.info({ 
      userId: req.user.id, 
      updatedUserId: req.params.id,
      newRoles: roles 
    }, 'User roles updated by admin');

    res.json({
      message: 'User roles updated successfully',
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
        email: user.email,
        phone: user.phone || '',
        roles: user.roles,
        accountStatus: user.accountStatus,
        isTrainee: user.isTrainee !== undefined ? user.isTrainee : false,
        dateOfBirth: user.dateOfBirth,
        notes: user.notes || '',
        photo: user.photo,
        photoHistory: user.photoHistory || [],
        clubMembership: user.clubMembership || { isCurrentMember: false, membershipHistory: [] },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message),
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/admin/children
 * Create a child User without parent (admin only)
 */
router.post('/children', requireRole('admin'), validateCreateClimber, async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, dateOfBirth, phone, notes } = req.body;

    const child = new User({
      firstName: firstName.trim(),
      middleName: middleName ? middleName.trim() : null,
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth || null,
      phone: phone || '',
      notes: notes || '',
      roles: ['climber'],
      accountStatus: 'inactive',
      isTrainee: true, // Child profiles are trainees by default
      email: null, // Explicitly set to null for children without email
      // NO passwordHash
    });

    await child.save();

    logger.info({ 
      adminId: req.user.id, 
      childId: child._id,
    }, 'Child created by admin');

    const userObj = child.toObject();
    delete userObj.passwordHash;

    res.status(201).json({
      child: userObj,
      message: 'Child created successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message),
        },
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/admin/children/:childId/activate
 * Activate a child account (admin only)
 */
router.post('/children/:childId/activate', requireRole('admin'), validateActivateClimber, async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { email, password, middleName, phone } = req.body;

    const updateData = {};
    if (middleName !== undefined) updateData.middleName = middleName;
    if (phone !== undefined) updateData.phone = phone;

    const user = await activateClimberProfile(childId, email, password, req.user.id, updateData);
    
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
 * POST /api/v1/admin/children/:childId/link-parent/:parentId
 * Link a child to a parent (admin only)
 */
router.post('/children/:childId/link-parent/:parentId', requireRole('admin'), async (req, res, next) => {
  try {
    const { childId, parentId } = req.params;

    // Verify child exists and has climber role
    const child = await User.findById(childId);
    if (!child) {
      return res.status(404).json({
        error: {
          message: 'Child not found',
        },
      });
    }

    if (!child.roles.includes('climber')) {
      return res.status(400).json({
        error: {
          message: 'User is not a climber',
        },
      });
    }

    // Verify parent exists and has climber role
    const parent = await User.findById(parentId);
    if (!parent) {
      return res.status(404).json({
        error: {
          message: 'Parent not found',
        },
      });
    }

    if (!parent.roles.includes('climber')) {
      return res.status(400).json({
        error: {
          message: 'User must have climber role to be a parent',
        },
      });
    }

    // Check if link already exists
    const existingLink = await ParentClimberLink.findOne({ parentId, climberId: childId });
    if (existingLink) {
      return res.status(409).json({
        error: {
          message: 'Child already linked to this parent',
        },
      });
    }

    // Create link
    const link = new ParentClimberLink({ parentId, climberId: childId });
    await link.save();

    logger.info({ 
      adminId: req.user.id, 
      parentId, 
      childId,
    }, 'Child linked to parent by admin');

    res.json({
      link,
      message: 'Child linked to parent successfully',
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: Object.values(error.errors).map(e => e.message),
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/children/:childId/unlink-parent/:parentId
 * Unlink a child from a parent (admin only)
 */
router.delete('/children/:childId/unlink-parent/:parentId', requireRole('admin'), async (req, res, next) => {
  try {
    const { childId, parentId } = req.params;

    const result = await ParentClimberLink.deleteOne({ parentId, climberId: childId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: {
          message: 'Link not found',
        },
      });
    }

    logger.info({ 
      adminId: req.user.id, 
      parentId, 
      childId,
    }, 'Child unlinked from parent by admin');

    res.json({
      message: 'Child unlinked from parent successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/children/cleanup
 * Delete all children users without email (cleanup old test data)
 * Accessible to: admin only
 */
router.delete('/children/cleanup', requireRole('admin'), async (req, res, next) => {
  try {
    // Find all users with role 'climber' and no email (including empty string)
    const childrenWithoutEmail = await User.find({ 
      roles: { $in: ['climber'] },
      $or: [
        { email: null },
        { email: { $exists: false } },
        { email: '' }
      ]
    });

    const childIds = childrenWithoutEmail.map(child => child._id);

    // Delete parent-climber links first
    await ParentClimberLink.deleteMany({ climberId: { $in: childIds } });

    // Delete the children users
    const result = await User.deleteMany({ 
      _id: { $in: childIds }
    });

    logger.info({ 
      adminId: req.user.id,
      deletedCount: result.deletedCount
    }, 'Old children without email deleted');

    res.json({
      message: `Deleted ${result.deletedCount} children without email`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error({ error }, 'Error cleaning up old children');
    next(error);
  }
});

/**
 * POST /api/v1/admin/fix-email-index
 * Fix email index by dropping and recreating it with proper partialFilterExpression
 * Accessible to: admin only
 */
router.post('/fix-email-index', requireRole('admin'), async (req, res, next) => {
  try {
    const db = User.db;
    const collection = db.collection('users');
    
    // Drop existing email index
    try {
      await collection.dropIndex('email_1');
      logger.info({ adminId: req.user.id }, 'Dropped existing email index');
    } catch (error) {
      if (error.code !== 27) { // 27 = IndexNotFound
        throw error;
      }
      logger.info({ adminId: req.user.id }, 'Email index does not exist, will create new one');
    }
    
    // Recreate index with partialFilterExpression
    await collection.createIndex(
      { email: 1 },
      { 
        unique: true, 
        sparse: true,
        partialFilterExpression: { email: { $ne: null } },
        name: 'email_1'
      }
    );
    
    logger.info({ adminId: req.user.id }, 'Recreated email index with partialFilterExpression');
    
    res.json({
      message: 'Email index fixed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Error fixing email index');
    next(error);
  }
});

export default router;

