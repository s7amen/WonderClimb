import * as trainingService from '../services/trainingService.js';
import logger from '../middleware/logging.js';

/**
 * POST /api/v1/training/sessions
 * Create a new training session
 */
export const createSession = async (req, res) => {
    try {
        const sessionData = req.body;
        const createdById = req.user.id;

        const session = await trainingService.createSession(sessionData, createdById);

        res.status(201).json({
            message: 'Session created successfully',
            session,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating session');
        res.status(400).json({
            error: { message: error.message || 'Failed to create session' },
        });
    }
};

/**
 * GET /api/v1/training/sessions
 * List training sessions
 */
export const getSessions = async (req, res) => {
    try {
        const { startDate, endDate, status, coachId, page, limit } = req.query;

        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (status) filters.status = status;
        if (coachId) filters.coachId = coachId;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await trainingService.getSessions(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching sessions');
        res.status(500).json({
            error: { message: 'Failed to fetch sessions' },
        });
    }
};

/**
 * GET /api/v1/training/sessions/:id
 * Get session details
 */
export const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await trainingService.getSessionById(id);

        res.json({ session });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching session');
        res.status(404).json({
            error: { message: error.message || 'Session not found' },
        });
    }
};

/**
 * PATCH /api/v1/training/sessions/:id
 * Update a training session
 */
export const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        const session = await trainingService.updateSession(id, updates, userId, userRoles);

        res.json({
            message: 'Session updated successfully',
            session,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating session');
        res.status(400).json({
            error: { message: error.message || 'Failed to update session' },
        });
    }
};

/**
 * DELETE /api/v1/training/sessions/:id
 * Cancel a training session
 */
export const cancelSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        const session = await trainingService.cancelSession(id, userId, userRoles);

        res.json({
            message: 'Session cancelled successfully',
            session,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error cancelling session');
        res.status(400).json({
            error: { message: error.message || 'Failed to cancel session' },
        });
    }
};

/**
 * GET /api/v1/training/sessions/:sessionId/attendance
 * Get attendance for a session
 */
export const getAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const attendance = await trainingService.getAttendanceForSession(sessionId);

        res.json({
            attendance,
            count: attendance.length,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching attendance');
        res.status(500).json({
            error: { message: 'Failed to fetch attendance' },
        });
    }
};

/**
 * POST /api/v1/training/sessions/:sessionId/attendance
 * Mark attendance for a session
 */
export const markAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { attendanceRecords } = req.body;
        const markedById = req.user.id;

        if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
            return res.status(400).json({
                error: { message: 'attendanceRecords array is required' },
            });
        }

        const results = await trainingService.markAttendance(sessionId, attendanceRecords, markedById);

        res.json({
            message: 'Attendance marked successfully',
            results,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error marking attendance');
        res.status(400).json({
            error: { message: error.message || 'Failed to mark attendance' },
        });
    }
};

/**
 * POST /api/v1/training/passes
 * Create/sell a training pass
 */
export const createTrainingPass = async (req, res) => {
    try {
        const passData = req.body;
        const createdById = req.user.id;

        const trainingPass = await trainingService.createTrainingPass(passData, createdById);

        res.status(201).json({
            message: 'Training pass created successfully',
            trainingPass,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating training pass');
        res.status(400).json({
            error: { message: error.message || 'Failed to create training pass' },
        });
    }
};

/**
 * GET /api/v1/training/passes
 * List all training passes
 */
export const getAllTrainingPasses = async (req, res) => {
    try {
        const { userId, isActive, paymentStatus, page, limit } = req.query;

        const filters = {};
        if (userId) filters.userId = userId;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        if (paymentStatus) filters.paymentStatus = paymentStatus;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await trainingService.getAllTrainingPasses(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching training passes');
        res.status(500).json({
            error: { message: 'Failed to fetch training passes' },
        });
    }
};

/**
 * GET /api/v1/training/passes/:id
 * Get training pass details
 */
export const getTrainingPassById = async (req, res) => {
    try {
        const { id } = req.params;
        const pass = await trainingService.getTrainingPassById(id);

        // Check permissions
        const userRoles = req.user.roles || [];
        const isOwner = pass.userId._id.toString() === req.user.id;
        const isStaff = userRoles.includes('admin') || userRoles.includes('coach');

        if (!isOwner && !isStaff) {
            return res.status(403).json({
                error: { message: 'Not authorized to view this pass' },
            });
        }

        res.json({ trainingPass: pass });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching training pass');
        res.status(404).json({
            error: { message: error.message || 'Training pass not found' },
        });
    }
};

/**
 * PATCH /api/v1/training/passes/:id
 * Update training pass
 */
export const updateTrainingPass = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedById = req.user.id;

        const pass = await trainingService.updateTrainingPass(id, updates, updatedById);

        res.json({
            message: 'Training pass updated successfully',
            trainingPass: pass,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating training pass');
        res.status(400).json({
            error: { message: error.message || 'Failed to update training pass' },
        });
    }
};

/**
 * GET /api/v1/training/my-passes
 * Get current user's training passes
 */
export const getMyTrainingPasses = async (req, res) => {
    try {
        const userId = req.user.id;
        const activeOnly = req.query.activeOnly === 'true';

        const passes = await trainingService.getUserTrainingPasses(userId, activeOnly);

        res.json({
            passes,
            count: passes.length,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching user training passes');
        res.status(500).json({
            error: { message: 'Failed to fetch training passes' },
        });
    }
};

/**
 * GET /api/v1/training/bookings
 * List all bookings (admin/coach)
 */
export const getAllBookings = async (req, res) => {
    try {
        const { sessionId, climberId, status, page, limit } = req.query;

        const filters = {};
        if (sessionId) filters.sessionId = sessionId;
        if (climberId) filters.climberId = climberId;
        if (status) filters.status = status;

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await trainingService.getAllBookings(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching bookings');
        res.status(500).json({
            error: { message: 'Failed to fetch bookings' },
        });
    }
};
