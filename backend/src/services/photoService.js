import { User } from '../models/user.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import logger from '../middleware/logging.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the next sequence number for a climber's photos
 */
export const getNextSequenceNumber = async (climberId) => {
  const user = await User.findById(climberId).select('photos').lean();
  if (!user || !user.photos || user.photos.length === 0) {
    return 1;
  }
  return user.photos.length + 1;
};

/**
 * Add a photo to a climber's profile
 */
export const addPhoto = async (climberId, filename, isMain = false) => {
  const user = await User.findById(climberId);
  if (!user) {
    throw new Error('Climber not found');
  }

  // If this is the first photo or isMain is true, set it as main
  if (!user.photos || user.photos.length === 0) {
    isMain = true;
  }

  // If setting as main, unset other main photos
  if (isMain) {
    if (user.photos) {
      user.photos.forEach(photo => {
        photo.isMain = false;
      });
    }
  }

  // Add new photo
  const newPhoto = {
    filename,
    isMain,
    uploadedAt: new Date(),
  };

  if (!user.photos) {
    user.photos = [];
  }
  user.photos.push(newPhoto);

  await user.save();

  logger.info({ climberId, filename, isMain }, 'Photo added to climber profile');

  return user.photos;
};

/**
 * Delete a photo from a climber's profile
 */
export const deletePhoto = async (climberId, filename) => {
  const user = await User.findById(climberId);
  if (!user) {
    throw new Error('Climber not found');
  }

  if (!user.photos || user.photos.length === 0) {
    throw new Error('No photos found');
  }

  // Find and remove the photo
  const photoIndex = user.photos.findIndex(p => p.filename === filename);
  if (photoIndex === -1) {
    throw new Error('Photo not found');
  }

  const photo = user.photos[photoIndex];
  const wasMain = photo.isMain;

  // Remove photo from array
  user.photos.splice(photoIndex, 1);

  // If deleted photo was main and there are other photos, set first one as main
  if (wasMain && user.photos.length > 0) {
    user.photos[0].isMain = true;
  }

  await user.save();

  // Delete file from disk - use common climbers folder
  const filepath = join(__dirname, '../../uploads/photos/climbers', filename);
  if (existsSync(filepath)) {
    try {
      await unlink(filepath);
      logger.info({ climberId, filename }, 'Photo file deleted from disk');
    } catch (error) {
      logger.error({ error, climberId, filename }, 'Error deleting photo file from disk');
      // Don't throw - database record is already deleted
    }
  }

  logger.info({ climberId, filename }, 'Photo deleted from climber profile');

  return user.photos;
};

/**
 * Set a photo as the main photo
 */
export const setMainPhoto = async (climberId, filename) => {
  const user = await User.findById(climberId);
  if (!user) {
    throw new Error('Climber not found');
  }

  if (!user.photos || user.photos.length === 0) {
    throw new Error('No photos found');
  }

  // Find the photo
  const photo = user.photos.find(p => p.filename === filename);
  if (!photo) {
    throw new Error('Photo not found');
  }

  // Unset all main photos
  user.photos.forEach(p => {
    p.isMain = false;
  });

  // Set this photo as main
  photo.isMain = true;

  await user.save();

  logger.info({ climberId, filename }, 'Photo set as main');

  return user.photos;
};

/**
 * Get photo file path - use common climbers folder
 */
export const getPhotoPath = (climberId, filename) => {
  return join(__dirname, '../../uploads/photos/climbers', filename);
};

