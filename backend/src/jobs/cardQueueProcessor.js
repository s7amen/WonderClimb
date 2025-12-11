import { PhysicalCardQueue } from '../models/physicalCardQueue.js';
import { PhysicalCard } from '../models/physicalCard.js';
import { GymPass } from '../models/gymPass.js';
import { TrainingPass } from '../models/trainingPass.js';
import * as physicalCardService from '../services/physicalCardService.js';
import logger from '../middleware/logging.js';

/**
 * Check if a GymPass is inactive (expired, deactivated, or exhausted)
 * @param {Object} pass - GymPass document
 * @returns {boolean} True if pass is inactive
 */
const isGymPassInactive = (pass) => {
    if (!pass) return true;
    if (!pass.isActive) return true;
    
    const now = new Date();
    
    // Check if expired
    if (pass.validUntil && new Date(pass.validUntil) < now) {
        return true;
    }
    
    // Check if exhausted (has entry limit and no remaining entries)
    // totalEntries > 0 means it's a prepaid pass with entry limit
    if (pass.totalEntries && pass.totalEntries > 0) {
        if (pass.remainingEntries !== null && pass.remainingEntries <= 0) {
            return true;
        }
    }
    
    return false;
};

/**
 * Check if a TrainingPass is inactive (expired, deactivated, or exhausted)
 * @param {Object} pass - TrainingPass document
 * @returns {boolean} True if pass is inactive
 */
const isTrainingPassInactive = (pass) => {
    if (!pass) return true;
    if (!pass.isActive) return true;
    
    const now = new Date();
    
    // Check if expired
    if (pass.validUntil && new Date(pass.validUntil) < now) {
        return true;
    }
    
    // Check if exhausted (has session limit and no remaining sessions)
    // totalSessions > 0 means it's a pack pass with session limit
    if (pass.totalSessions && pass.totalSessions > 0) {
        if (pass.remainingSessions !== null && pass.remainingSessions <= 0) {
            return true;
        }
    }
    
    return false;
};

/**
 * Process pending card queue entries
 * Checks if old passes are inactive and activates new passes automatically
 * @returns {Promise<Object>} Processing result
 */
export const processCardQueue = async () => {
    try {
        const pendingQueues = await PhysicalCardQueue.find({ status: 'pending' });
        logger.info({ count: pendingQueues.length }, 'Processing card queue');
        
        let processedCount = 0;
        let activatedCount = 0;
        let skippedCount = 0;
        let errors = [];
        
        for (const queue of pendingQueues) {
            try {
                // First, check if the physical card still exists and is linked to the expected pass
                const physicalCard = await PhysicalCard.findOne({ physicalCardCode: queue.physicalCardCode });
                
                if (!physicalCard) {
                    logger.warn({ 
                        queueId: queue._id, 
                        physicalCardCode: queue.physicalCardCode 
                    }, 'Physical card not found for queue entry');
                    errors.push({ queueId: queue._id, error: 'Physical card not found' });
                    processedCount++;
                    continue;
                }
                
                // Get the current pass that the physical card is linked to
                // (this might be different from queue.currentActivePassId if card was manually re-linked)
                let currentActivePass = null;
                let isCurrentPassInactive = true;
                
                if (physicalCard.status === 'linked' && physicalCard.linkedToCardInternalCode) {
                    if (physicalCard.linkedToPassType === 'training') {
                        currentActivePass = await TrainingPass.findById(physicalCard.linkedToCardInternalCode);
                        isCurrentPassInactive = isTrainingPassInactive(currentActivePass);
                    } else {
                        // Default to gym
                        currentActivePass = await GymPass.findById(physicalCard.linkedToCardInternalCode);
                        isCurrentPassInactive = isGymPassInactive(currentActivePass);
                    }
                } else {
                    // Card is not linked to any pass - can activate immediately
                    isCurrentPassInactive = true;
                }
                
                logger.info({ 
                    queueId: queue._id, 
                    physicalCardCode: queue.physicalCardCode,
                    cardStatus: physicalCard.status,
                    currentPassId: physicalCard.linkedToCardInternalCode?.toString(),
                    currentPassType: physicalCard.linkedToPassType,
                    currentPassIsActive: currentActivePass?.isActive,
                    currentPassValidUntil: currentActivePass?.validUntil,
                    currentPassRemainingEntries: currentActivePass?.remainingEntries,
                    currentPassRemainingSessions: currentActivePass?.remainingSessions,
                    isCurrentPassInactive
                }, 'Checking queue entry');
                
                if (isCurrentPassInactive) {
                    // Activate the new pass
                    const passTypeForLink = queue.passType === 'GymPass' ? 'gym' : 'training';
                    await physicalCardService.linkToPass(
                        queue.physicalCardCode, 
                        queue.pendingPassId, 
                        passTypeForLink
                    );
                    
                    // Update queue status
                    queue.status = 'activated';
                    queue.activatedAt = new Date();
                    await queue.save();
                    
                    activatedCount++;
                    logger.info({ 
                        queueId: queue._id, 
                        physicalCardCode: queue.physicalCardCode,
                        passId: queue.pendingPassId,
                        passType: queue.passType
                    }, 'Queued pass activated automatically');
                } else {
                    skippedCount++;
                    logger.info({ 
                        queueId: queue._id, 
                        physicalCardCode: queue.physicalCardCode,
                        reason: 'Current pass is still active'
                    }, 'Skipping queue entry - current pass still active');
                }
                
                processedCount++;
            } catch (error) {
                logger.error({ 
                    error: error.message, 
                    queueId: queue._id,
                    physicalCardCode: queue.physicalCardCode
                }, 'Error processing queue entry');
                errors.push({ queueId: queue._id, error: error.message });
                processedCount++;
            }
        }
        
        const result = {
            processed: processedCount,
            activated: activatedCount,
            skipped: skippedCount,
            errors: errors.length,
            errorDetails: errors
        };
        
        logger.info(result, 'Card queue processing completed');
        return result;
    } catch (error) {
        logger.error({ error: error.message }, 'Error in processCardQueue');
        throw error;
    }
};

