import mongoose from 'mongoose';
import { ParentClimberLink } from '../models/parentClimberLink.js';
import logger from '../middleware/logging.js';

/**
 * Get all climbers linked to a parent
 */
export const getClimbersByParent = async (parentId) => {
  try {
    const links = await ParentClimberLink.find({ parentId })
      .populate('climberId')
      .lean();

    return links.map(link => link.climberId);
  } catch (error) {
    logger.error({ error, parentId }, 'Error fetching climbers for parent');
    throw error;
  }
};

/**
 * Check if a climber is linked to a parent
 */
export const isClimberLinkedToParent = async (parentId, climberId) => {
  try {
    // Normalize IDs to ObjectId format for proper comparison
    const normalizedParentId = mongoose.Types.ObjectId.isValid(parentId) 
      ? new mongoose.Types.ObjectId(parentId) 
      : parentId;
    const normalizedClimberId = mongoose.Types.ObjectId.isValid(climberId) 
      ? new mongoose.Types.ObjectId(climberId) 
      : climberId;
    
    logger.info({
      parentId,
      climberId,
      normalizedParentId: normalizedParentId.toString(),
      normalizedClimberId: normalizedClimberId.toString(),
      parentIdType: typeof parentId,
      climberIdType: typeof climberId,
    }, 'Checking parent-climber link');
    
    const link = await ParentClimberLink.findOne({ 
      parentId: normalizedParentId, 
      climberId: normalizedClimberId 
    });
    
    logger.info({
      parentId: normalizedParentId.toString(),
      climberId: normalizedClimberId.toString(),
      linkFound: !!link,
      linkId: link?._id,
      linkParentId: link?.parentId?.toString(),
      linkClimberId: link?.climberId?.toString(),
    }, 'Parent-climber link check result');
    
    return !!link;
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error checking parent-climber link');
    throw error;
  }
};

/**
 * Create a parent-climber link
 */
export const createLink = async (parentId, climberId) => {
  try {
    // Normalize IDs to ObjectId format for proper comparison
    const normalizedParentId = mongoose.Types.ObjectId.isValid(parentId) 
      ? new mongoose.Types.ObjectId(parentId) 
      : parentId;
    const normalizedClimberId = mongoose.Types.ObjectId.isValid(climberId) 
      ? new mongoose.Types.ObjectId(climberId) 
      : climberId;
    
    // Check if link already exists
    const existing = await ParentClimberLink.findOne({ 
      parentId: normalizedParentId, 
      climberId: normalizedClimberId 
    });
    if (existing) {
      logger.info({ parentId: normalizedParentId.toString(), climberId: normalizedClimberId.toString() }, 'Parent-climber link already exists');
      return existing;
    }

    const link = new ParentClimberLink({ 
      parentId: normalizedParentId, 
      climberId: normalizedClimberId 
    });
    await link.save();
    logger.info({ 
      parentId: normalizedParentId.toString(), 
      climberId: normalizedClimberId.toString(),
      linkId: link._id.toString(),
    }, 'Parent-climber link created');
    return link;
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error creating parent-climber link');
    throw error;
  }
};

/**
 * Remove a parent-climber link
 */
export const removeLink = async (parentId, climberId) => {
  try {
    const result = await ParentClimberLink.deleteOne({ parentId, climberId });
    if (result.deletedCount > 0) {
      logger.info({ parentId, climberId }, 'Parent-climber link removed');
    }
    return result.deletedCount > 0;
  } catch (error) {
    logger.error({ error, parentId, climberId }, 'Error removing parent-climber link');
    throw error;
  }
};

