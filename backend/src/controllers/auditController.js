import * as auditService from '../services/auditService.js';

export const getAuditLogs = async (req, res, next) => {
    try {
        const { page, limit, action, resource, userId } = req.query;

        const result = await auditService.getLogs({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 50,
            action,
            resource,
            userId
        });

        res.json(result);
    } catch (error) {
        next(error);
    }
};
