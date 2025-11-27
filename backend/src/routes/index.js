import express from 'express';
import authRoutes from './auth.js';
import parentClimbersRoutes from './parentClimbers.js';
import parentProfileRoutes from './parentProfile.js';
import sessionsPublicRoutes from './sessionsPublic.js';
import bookingsRoutes from './bookings.js';
import myClimberRoutes from './myClimber.js';
import coachSessionsRoutes from './coachSessions.js';
import attendanceRoutes from './attendance.js';
import adminSessionsRoutes from './adminSessions.js';
import adminCalendarRoutes from './adminCalendar.js';
import adminFinanceRoutes from './adminFinance.js';
import adminUsersRoutes from './adminUsers.js';
import adminSettingsRoutes from './adminSettings.js';
import climberPhotosRoutes from './climberPhotos.js';
import competitionsRoutes from './competitions.js';
import competitionPublicRoutes from './competitionPublic.js';
import docsRoutes from './docs.js';

const router = express.Router();

// API root
router.get('/', (req, res) => {
  res.json({
    message: 'WonderClimb API v1',
    version: '0.1.0',
  });
});

// Public routes (no authentication required)
router.use('/auth', authRoutes);
router.use('/sessions', sessionsPublicRoutes);
router.use('/competitions', competitionPublicRoutes);

// Protected routes (require authentication)
// IMPORTANT: Register bookingsRoutes on /bookings to avoid conflicts with other routes
router.use('/bookings', bookingsRoutes); // Bookings routes
// IMPORTANT: Register parentProfileRoutes BEFORE parentClimbersRoutes to avoid route conflicts
// parentProfileRoutes has /me/profile which must be matched before /me/climbers/:climberId
router.use('/parents', parentProfileRoutes);
router.use('/parents', parentClimbersRoutes);
router.use('/me', myClimberRoutes); // Self-managed climber routes (/me/climber) - register on /me to avoid conflicts
router.use('/coaches', coachSessionsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/admin', adminSessionsRoutes);
router.use('/admin', adminCalendarRoutes);
router.use('/admin', adminFinanceRoutes);
router.use('/admin', adminUsersRoutes);
router.use('/admin', adminSettingsRoutes);
router.use('/admin', climberPhotosRoutes);
router.use('/admin/competitions', competitionsRoutes);
router.use('/api/v1', docsRoutes); // API docs

export default router;

