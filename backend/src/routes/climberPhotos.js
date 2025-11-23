import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { User } from '../models/user.js';
import { upload, processImage } from '../middleware/upload.js';
import { addPhoto, deletePhoto, setMainPhoto, getPhotoPath } from '../services/photoService.js';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from '../middleware/logging.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/admin/climbers/:id/photos
 * Upload a photo for a climber
 * Accessible to: admin, coach
 */
router.post('/climbers/:id/photos', requireRole('admin', 'coach'), upload.single('photo'), async (req, res, next) => {
  try {
    const climberId = req.params.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: {
          message: 'No file uploaded',
        },
      });
    }

    // Get climber info
    const climber = await User.findById(climberId).select('firstName middleName lastName photos');
    if (!climber) {
      return res.status(404).json({
        error: {
          message: 'Climber not found',
        },
      });
    }

    // Get next sequence number
    const sequenceNumber = climber.photos ? climber.photos.length + 1 : 1;

    // Process and save image
    const { filename } = await processImage(
      file.buffer,
      climberId,
      climber.firstName,
      climber.middleName,
      climber.lastName,
      sequenceNumber
    );

    // Add photo to database
    const isMain = !climber.photos || climber.photos.length === 0;
    const photos = await addPhoto(climberId, filename, isMain);

    logger.info({ climberId, filename, uploadedBy: req.user.id }, 'Photo uploaded');

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: {
        filename,
        isMain,
      },
      photos,
    });
  } catch (error) {
    logger.error({ error, climberId: req.params.id }, 'Error uploading photo');
    if (error.message.includes('Invalid file type')) {
      return res.status(400).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/v1/admin/climbers/:id/photos/:filename
 * Delete a photo from a climber's profile
 * Accessible to: admin, coach
 */
router.delete('/climbers/:id/photos/:filename', requireRole('admin', 'coach'), async (req, res, next) => {
  try {
    const { id: climberId, filename } = req.params;

    // Verify climber exists
    const climber = await User.findById(climberId).select('_id');
    if (!climber) {
      return res.status(404).json({
        error: {
          message: 'Climber not found',
        },
      });
    }

    const photos = await deletePhoto(climberId, filename);

    logger.info({ climberId, filename, deletedBy: req.user.id }, 'Photo deleted');

    res.json({
      message: 'Photo deleted successfully',
      photos,
    });
  } catch (error) {
    logger.error({ error, climberId: req.params.id, filename: req.params.filename }, 'Error deleting photo');
    if (error.message === 'Photo not found' || error.message === 'No photos found') {
      return res.status(404).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * PUT /api/v1/admin/climbers/:id/photos/:filename/set-main
 * Set a photo as the main photo
 * Accessible to: admin, coach
 */
router.put('/climbers/:id/photos/:filename/set-main', requireRole('admin', 'coach'), async (req, res, next) => {
  try {
    const { id: climberId, filename } = req.params;

    // Verify climber exists
    const climber = await User.findById(climberId).select('_id');
    if (!climber) {
      return res.status(404).json({
        error: {
          message: 'Climber not found',
        },
      });
    }

    const photos = await setMainPhoto(climberId, filename);

    logger.info({ climberId, filename, updatedBy: req.user.id }, 'Photo set as main');

    res.json({
      message: 'Main photo updated successfully',
      photos,
    });
  } catch (error) {
    logger.error({ error, climberId: req.params.id, filename: req.params.filename }, 'Error setting main photo');
    if (error.message === 'Photo not found' || error.message === 'No photos found') {
      return res.status(404).json({
        error: {
          message: error.message,
        },
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/admin/photos/:climberId/:filename
 * Get a photo file
 * Accessible to: admin, coach
 */
router.get('/photos/:climberId/:filename', requireRole('admin', 'coach'), async (req, res, next) => {
  try {
    const { climberId, filename } = req.params;

    // Verify climber exists and user has access
    const climber = await User.findById(climberId).select('photos');
    if (!climber) {
      return res.status(404).json({
        error: {
          message: 'Climber not found',
        },
      });
    }

    // Verify photo exists in database
    if (!climber.photos || !climber.photos.find(p => p.filename === filename)) {
      return res.status(404).json({
        error: {
          message: 'Photo not found',
        },
      });
    }

    // Get file path - use common climbers folder
    const filepath = getPhotoPath(climberId, filename);

    if (!existsSync(filepath)) {
      return res.status(404).json({
        error: {
          message: 'Photo file not found',
        },
      });
    }

    // Send file - getPhotoPath already returns absolute path
    res.sendFile(filepath);
  } catch (error) {
    logger.error({ error, climberId: req.params.climberId, filename: req.params.filename }, 'Error serving photo');
    next(error);
  }
});

export default router;

