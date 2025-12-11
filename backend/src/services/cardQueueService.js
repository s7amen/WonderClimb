import { PhysicalCardQueue } from '../models/physicalCardQueue.js';
import { PhysicalCard } from '../models/physicalCard.js';
import { GymPass } from '../models/gymPass.js';
import { TrainingPass } from '../models/trainingPass.js';
import * as physicalCardService from './physicalCardService.js';
import logger from '../middleware/logging.js';

/**
 * Add a pass to the queue for a physical card
 * @param {string} physicalCardCode - Physical card code
 * @param {string} passId - Pass ID to queue
 * @param {string} passType - 'GymPass' or 'TrainingPass'
 * @param {string} userId - User ID who created the queue entry
 * @returns {Promise<Object>} Queue entry
 */
export const queuePassForCard = async (physicalCardCode, passId, passType, userId) => {
    try {
        // Validate physical card exists
        const physicalCard = await PhysicalCard.findOne({ physicalCardCode });
        if (!physicalCard) {
            throw new Error('Physical card not found');
        }

        // Validate pass exists
        const PassModel = passType === 'GymPass' ? GymPass : TrainingPass;
        const pass = await PassModel.findById(passId);
        if (!pass) {
            throw new Error(`${passType} not found`);
        }

        // Check if card is currently linked
        if (physicalCard.status === 'linked' && physicalCard.linkedToCardInternalCode) {
            // Find the current active pass based on linkedToPassType
            let currentPass = null;
            let currentPassType = 'GymPass';
            
            if (physicalCard.linkedToPassType === 'training') {
                currentPass = await TrainingPass.findById(physicalCard.linkedToCardInternalCode);
                currentPassType = 'TrainingPass';
            } else {
                // Default to gym
                currentPass = await GymPass.findById(physicalCard.linkedToCardInternalCode);
                currentPassType = 'GymPass';
            }

            if (!currentPass) {
                throw new Error('Current active pass not found');
            }

            // Create queue entry
            const queueEntry = new PhysicalCardQueue({
                physicalCardCode,
                pendingPassId: passId,
                passType,
                currentActivePassId: physicalCard.linkedToCardInternalCode,
                currentPassType,
                status: 'pending',
                createdById: userId,
            });

            await queueEntry.save();
            logger.info({ 
                queueId: queueEntry._id, 
                physicalCardCode, 
                passId, 
                passType 
            }, 'Pass queued for physical card');

            return queueEntry;
        } else {
            throw new Error('Physical card is not currently linked to any pass');
        }
    } catch (error) {
        logger.error({ error: error.message, physicalCardCode, passId, passType }, 'Error queueing pass for card');
        throw error;
    }
};

/**
 * Get pending queue entries
 * @returns {Promise<Array>} Array of pending queue entries
 */
export const getPendingQueues = async () => {
    try {
        return await PhysicalCardQueue.find({ status: 'pending' })
            .populate('pendingPassId')
            .populate('currentActivePassId')
            .populate('createdById', 'firstName lastName email')
            .sort({ queuedAt: 1 })
            .lean();
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching pending queues');
        throw error;
    }
};

/**
 * Activate a queued pass manually
 * @param {string} queueId - Queue entry ID
 * @returns {Promise<Object>} Updated queue entry
 */
export const activateQueuedPass = async (queueId) => {
    try {
        const queue = await PhysicalCardQueue.findById(queueId);
        if (!queue) {
            throw new Error('Queue entry not found');
        }

        if (queue.status !== 'pending') {
            throw new Error(`Queue entry is not pending (status: ${queue.status})`);
        }

        // Link the physical card to the pending pass
        const passTypeForLink = queue.passType === 'GymPass' ? 'gym' : 'training';
        await physicalCardService.linkToPass(queue.physicalCardCode, queue.pendingPassId, passTypeForLink);

        // Update queue status
        queue.status = 'activated';
        queue.activatedAt = new Date();
        await queue.save();

        logger.info({ queueId, physicalCardCode: queue.physicalCardCode, passId: queue.pendingPassId }, 'Queued pass activated manually');

        return queue;
    } catch (error) {
        logger.error({ error: error.message, queueId }, 'Error activating queued pass');
        throw error;
    }
};

/**
 * Get all queue entries with optional filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of queue entries
 */
export const getAllQueues = async (filters = {}) => {
    try {
        const query = {};
        
        if (filters.status) {
            query.status = filters.status;
        }
        
        if (filters.physicalCardCode) {
            query.physicalCardCode = filters.physicalCardCode;
        }
        
        if (filters.passType) {
            query.passType = filters.passType;
        }

        return await PhysicalCardQueue.find(query)
            .populate('pendingPassId')
            .populate('currentActivePassId')
            .populate('createdById', 'firstName lastName email')
            .sort({ queuedAt: -1 })
            .lean();
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching queue entries');
        throw error;
    }
};

