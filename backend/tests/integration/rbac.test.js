import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { Session } from '../../src/models/session.js';
import { generateToken } from '../../src/middleware/auth.js';

describe('RBAC Integration Tests', () => {
  let parentToken, parentUser;
  let coachToken, coachUser;
  let climberToken, climberUser;
  let adminToken, adminUser;
  let otherParentToken, otherParentUser;
  let climber;
  let session;

  beforeAll(async () => {
    // Create parent user
    parentUser = new User({
      email: 'parent@rbac.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Parent',
      lastName: 'User',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await parentUser.save();
    parentToken = generateToken({ id: parentUser._id.toString(), roles: parentUser.roles });

    // Create other parent user
    otherParentUser = new User({
      email: 'otherparent@rbac.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Other',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await otherParentUser.save();
    otherParentToken = generateToken({ id: otherParentUser._id.toString(), roles: otherParentUser.roles });

    // Create coach user
    coachUser = new User({
      email: 'coach@rbac.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Coach',
      lastName: 'User',
      roles: ['coach'],
      accountStatus: 'active',
    });
    await coachUser.save();
    coachToken = generateToken({ id: coachUser._id.toString(), roles: coachUser.roles });

    // Create climber user
    climberUser = new User({
      email: 'climber@rbac.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Climber',
      lastName: 'User',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await climberUser.save();
    climberToken = generateToken({ id: climberUser._id.toString(), roles: climberUser.roles });

    // Create admin user
    adminUser = new User({
      email: 'admin@rbac.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
      accountStatus: 'active',
    });
    await adminUser.save();
    adminToken = generateToken({ id: adminUser._id.toString(), roles: adminUser.roles });

    // Create climber linked to parent
    climber = await User.create({
      firstName: 'RBAC',
      lastName: 'Test',
      roles: ['climber'],
      accountStatus: 'active',
    });

    // Create session
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    futureDate.setHours(18, 0, 0, 0);

    session = await Session.create({
      title: 'RBAC Test Session',
      date: futureDate,
      durationMinutes: 60,
      capacity: 10,
      status: 'active',
      coachIds: [coachUser._id],
    });
  });

  describe('Parent Role Isolation', () => {
    it('should allow parent to access their own climbers', async () => {
      await request(app)
        .get('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
    });

    it('should prevent parent from accessing admin endpoints', async () => {
      await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          title: 'Test',
          date: new Date().toISOString(),
          durationMinutes: 60,
          capacity: 10,
          coachIds: [coachUser._id.toString()],
        })
        .expect(403);
    });
  });

  describe('Coach Role Isolation', () => {
    it('should allow coach to access their sessions', async () => {
      await request(app)
        .get('/api/v1/coaches/me/sessions/today')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);
    });

    it('should prevent coach from accessing admin endpoints', async () => {
      await request(app)
        .get('/api/v1/admin/calendar')
        .set('Authorization', `Bearer ${coachToken}`)
        .query({ view: 'month', startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(403);
    });
  });

  describe('Climber Role Isolation', () => {
    it('should allow climber to access their own profile', async () => {
      await request(app)
        .get('/api/v1/me/climber')
        .set('Authorization', `Bearer ${climberToken}`)
        .expect(404); // No profile yet, but endpoint is accessible
    });

    it('should allow climber to access parent endpoints (returns empty list if no children)', async () => {
      await request(app)
        .get('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${climberToken}`)
        .expect(200);
    });
  });

  describe('Admin Role Access', () => {
    it('should allow admin to access all endpoints', async () => {
      await request(app)
        .get('/api/v1/admin/calendar')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ view: 'month', startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(200);
    });
  });
});

