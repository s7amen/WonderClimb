import { CronJobExecution } from '../models/cronJobExecution.js';
import logger from '../middleware/logging.js';

/**
 * Record a cron job execution
 * @param {string} jobName - Name of the job
 * @param {Function} jobFunction - Async function to execute
 * @param {string} triggeredBy - 'cron' or 'manual'
 * @param {string|null} userId - User ID if manually triggered
 * @returns {Promise<Object>} Execution result
 */
export const recordJobExecution = async (jobName, jobFunction, triggeredBy, userId = null) => {
    const execution = new CronJobExecution({
        jobName,
        status: 'running',
        startedAt: new Date(),
        triggeredBy,
        triggeredByUserId: userId
    });
    await execution.save();
    
    logger.info({ jobName, triggeredBy, executionId: execution._id }, 'Cron job execution started');
    
    try {
        const startTime = Date.now();
        const result = await jobFunction();
        
        execution.status = 'success';
        execution.completedAt = new Date();
        execution.duration = Date.now() - startTime;
        await execution.save();
        
        logger.info({ 
            jobName, 
            executionId: execution._id, 
            duration: execution.duration 
        }, 'Cron job execution completed successfully');
        
        return { execution, result };
    } catch (error) {
        execution.status = 'failed';
        execution.completedAt = new Date();
        execution.error = error.message;
        await execution.save();
        
        logger.error({ 
            jobName, 
            executionId: execution._id, 
            error: error.message 
        }, 'Cron job execution failed');
        
        throw error;
    }
};

/**
 * Get job execution history
 * @param {string|null} jobName - Filter by job name (optional)
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of executions
 */
export const getJobExecutions = async (jobName = null, limit = 50) => {
    const query = jobName ? { jobName } : {};
    return await CronJobExecution.find(query)
        .sort({ startedAt: -1 })
        .limit(limit)
        .populate('triggeredByUserId', 'firstName lastName email')
        .lean();
};

/**
 * Get last execution for a job
 * @param {string} jobName - Job name
 * @returns {Promise<Object|null>} Last execution or null
 */
export const getLastExecution = async (jobName) => {
    return await CronJobExecution.findOne({ jobName })
        .sort({ startedAt: -1 })
        .populate('triggeredByUserId', 'firstName lastName email')
        .lean();
};





