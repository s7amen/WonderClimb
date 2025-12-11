import cron from 'node-cron';
import { processCardQueue } from './cardQueueProcessor.js';
import { recordJobExecution } from '../services/cronExecutionService.js';
import logger from '../middleware/logging.js';

/**
 * Start the cron scheduler
 * Registers all scheduled jobs
 */
export const startScheduler = () => {
    // Card Queue Processor - every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running scheduled card queue processor');
        try {
            await recordJobExecution('cardQueueProcessor', processCardQueue, 'cron');
        } catch (error) {
            logger.error({ error: error.message }, 'Error in scheduled card queue processor');
        }
    });
    
    logger.info('Cron scheduler started - jobs configured');
};

/**
 * Manual triggers for cron jobs
 * Used for admin UI to trigger jobs manually
 */
export const manualTriggers = {
    cardQueueProcessor: processCardQueue
};

