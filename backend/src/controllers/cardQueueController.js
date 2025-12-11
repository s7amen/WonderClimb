import * as cardQueueService from '../services/cardQueueService.js';
import logger from '../middleware/logging.js';

/**
 * Add a pass to the queue for a physical card
 * POST /api/v1/cards/queue
 */
export const queueCardForPass = async (req, res) => {
    try {
        const { physicalCardCode, passId, passType } = req.body;
        const userId = req.user?.id || req.user?._id;

        if (!physicalCardCode || !passId || !passType) {
            return res.status(400).json({
                error: 'Missing required fields: physicalCardCode, passId, passType'
            });
        }

        if (!['GymPass', 'TrainingPass'].includes(passType)) {
            return res.status(400).json({
                error: 'Invalid passType. Must be "GymPass" or "TrainingPass"'
            });
        }

        const queueEntry = await cardQueueService.queuePassForCard(
            physicalCardCode,
            passId,
            passType,
            userId
        );

        res.status(201).json({
            message: 'Pass added to queue successfully',
            data: queueEntry
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error queueing card for pass');
        res.status(500).json({
            error: error.message || 'Failed to queue card for pass'
        });
    }
};

/**
 * Get all queued cards
 * GET /api/v1/cards/queue
 */
export const getQueuedCards = async (req, res) => {
    try {
        const { status, physicalCardCode, passType } = req.query;
        
        const filters = {};
        if (status) filters.status = status;
        if (physicalCardCode) filters.physicalCardCode = physicalCardCode;
        if (passType) filters.passType = passType;

        const queues = await cardQueueService.getAllQueues(filters);

        res.json({
            message: 'Queued cards retrieved successfully',
            data: queues,
            count: queues.length
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error getting queued cards');
        res.status(500).json({
            error: error.message || 'Failed to get queued cards'
        });
    }
};

/**
 * Manually activate a queued card
 * POST /api/v1/cards/queue/:id/activate
 */
export const activateQueuedCard = async (req, res) => {
    try {
        const { id } = req.params;

        const queueEntry = await cardQueueService.activateQueuedPass(id);

        res.json({
            message: 'Queued card activated successfully',
            data: queueEntry
        });
    } catch (error) {
        logger.error({ error: error.message, queueId: req.params.id }, 'Error activating queued card');
        res.status(500).json({
            error: error.message || 'Failed to activate queued card'
        });
    }
};


