import { manualTriggers } from '../jobs/scheduler.js';
import { recordJobExecution, getJobExecutions, getLastExecution } from '../services/cronExecutionService.js';
import logger from '../middleware/logging.js';

/**
 * List all cron jobs with their last execution status
 * GET /api/v1/admin/cron/jobs
 */
export const listCronJobs = async (req, res) => {
    try {
        const jobs = [
            {
                name: 'cardQueueProcessor',
                displayName: 'Card Queue Processor',
                description: 'Автоматично активиране на физически карти от опашката',
                schedule: '0 0 * * *', // Cron pattern
                scheduleReadable: 'Всеки ден в полунощ (00:00)'
            }
            // Add new jobs here
        ];
        
        // Add last execution for each job
        for (const job of jobs) {
            const lastExec = await getLastExecution(job.name);
            job.lastExecution = lastExec;
        }
        
        res.json({ jobs });
    } catch (error) {
        logger.error({ error: error.message }, 'Error listing cron jobs');
        res.status(500).json({
            error: error.message || 'Failed to list cron jobs'
        });
    }
};

/**
 * Manually trigger a cron job
 * POST /api/v1/admin/cron/jobs/:jobName/trigger
 */
export const triggerCronJob = async (req, res) => {
    try {
        const { jobName } = req.params;
        const userId = req.user?.id || req.user?._id;
        
        const jobFunction = manualTriggers[jobName];
        if (!jobFunction) {
            return res.status(404).json({ 
                error: `Job "${jobName}" not found` 
            });
        }
        
        logger.info({ jobName, userId }, 'Manually triggering cron job');
        
        await recordJobExecution(jobName, jobFunction, 'manual', userId);
        
        res.json({ 
            message: `Job "${jobName}" triggered successfully` 
        });
    } catch (error) {
        logger.error({ error: error.message, jobName: req.params.jobName }, 'Error triggering cron job');
        res.status(500).json({
            error: error.message || 'Failed to trigger cron job'
        });
    }
};

/**
 * Get execution history for a cron job
 * GET /api/v1/admin/cron/jobs/:jobName/history
 */
export const getCronJobHistory = async (req, res) => {
    try {
        const { jobName } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const executions = await getJobExecutions(jobName, limit);
        
        res.json({ 
            executions,
            count: executions.length
        });
    } catch (error) {
        logger.error({ error: error.message, jobName: req.params.jobName }, 'Error getting cron job history');
        res.status(500).json({
            error: error.message || 'Failed to get cron job history'
        });
    }
};

