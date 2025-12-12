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
import familyRoutes from './family.js';
import competitionsRoutes from './competitions.js';
import competitionPublicRoutes from './competitionPublic.js';
import docsRoutes from './docs.js';
import gymRoutes from './gym.js';
import trainingRoutes from './training.js';
import financeRoutes from './finance.js';
import productRoutes from './products.js';
import saleRoutes from './saleRoutes.js';
import pricingRoutes from './pricing.js';
import cardRoutes from './cardRoutes.js';
import cronRoutes from './cronRoutes.js';
import adminLogsRoutes from './adminLogs.js';

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
router.use('/families', familyRoutes);

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
router.use('/admin', adminLogsRoutes);
router.use('/admin/competitions', competitionsRoutes);
router.use('/gym', gymRoutes); // Gym routes (check-in, passes)
router.use('/training', trainingRoutes); // Training routes (sessions, attendance, passes)
router.use('/finance', financeRoutes); // Finance routes (entries, reports) - admin only
router.use('/products', productRoutes); // Product routes (CRUD)
router.use('/sales', saleRoutes); // Sales routes (POS) - instructor+
router.use('/pricing', pricingRoutes); // Pricing routes (CRUD, versioning) - admin only
router.use('/cards', cardRoutes); // Card queue routes - admin/staff
router.use('/admin/cron', cronRoutes); // Cron job management routes - admin only
router.use('/api/v1', docsRoutes); // API docs

export default router;

