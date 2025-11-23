import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { Session } from '../../src/models/session.js';
import { Booking } from '../../src/models/booking.js';
import { generateToken } from '../../src/middleware/auth.js';

describe('Admin Sessions E2E Tests', () => {
  let adminToken;
  let adminUser;
  let coachUser;

  beforeAll(async () => {
    // Create admin user
    adminUser = new User({
      email: 'admin@sessions.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
      accountStatus: 'active',
    });
    await adminUser.save();
    adminToken = generateToken({ id: adminUser._id.toString(), email: adminUser.email, roles: adminUser.roles });

    // Create coach user
    coachUser = new User({
      email: 'coach@sessions.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Coach',
      roles: ['coach'],
      accountStatus: 'active',
    });
    await coachUser.save();
  });

  describe('POST /api/v1/admin/sessions', () => {
    it('should create a new session', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      futureDate.setHours(18, 0, 0, 0);

      const response = await request(app)
        .post('/api/v1/admin/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Session',
          date: futureDate.toISOString(),
          durationMinutes: 60,
          capacity: 15,
          coachIds: [coachUser._id.toString()],
          coachPayoutAmount: 50,
          coachPayoutStatus: 'unpaid',
        })
        .expect(201);

      expect(response.body.session).toBeDefined();
      expect(response.body.session.title).toBe('New Session');
      expect(response.body.session.coachPayoutAmount).toBe(50);
      expect(response.body.session.coachPayoutStatus).toBe('unpaid');
    });

    it('should reject request without admin role', async () => {
      const parentUser = new User({
        email: 'parent@sessions.com',
        passwordHash: await User.hashPassword('password123'),
        firstName: 'Test',
        lastName: 'Parent',
        roles: ['climber'],
        accountStatus: 'active',
      });
      await parentUser.save();
      const parentToken = generateToken({ id: parentUser._id.toString(), email: parentUser.email, roles: parentUser.roles });

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

  describe('PUT /api/v1/admin/sessions/:sessionId', () => {
    it('should update a session', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      futureDate.setHours(18, 0, 0, 0);

      const session = await Session.create({
        title: 'Original Title',
        date: futureDate,
        durationMinutes: 60,
        capacity: 10,
        status: 'active',
        coachIds: [coachUser._id],
      });

      const response = await request(app)
        .put(`/api/v1/admin/sessions/${session._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
          capacity: 20,
        })
        .expect(200);

      expect(response.body.session.title).toBe('Updated Title');
      expect(response.body.session.capacity).toBe(20);
    });

    it('should prevent reducing capacity below current bookings', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      futureDate.setHours(18, 0, 0, 0);

      const session = await Session.create({
        title: 'Test Session',
        date: futureDate,
        durationMinutes: 60,
        capacity: 10,
        status: 'active',
        coachIds: [coachUser._id],
      });

      // Create a child User for booking
      const childUser = await User.create({
        firstName: 'Test',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // Create some bookings
      await Booking.create({
        sessionId: session._id,
        climberId: childUser._id,
        bookedById: adminUser._id,
        status: 'booked',
      });

      await request(app)
        .put(`/api/v1/admin/sessions/${session._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          capacity: 0, // Below current bookings
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/admin/sessions/:sessionId/payout-status', () => {
    it('should update coach payout status', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      futureDate.setHours(18, 0, 0, 0);

      const session = await Session.create({
        title: 'Payout Test',
        date: futureDate,
        durationMinutes: 60,
        capacity: 10,
        status: 'active',
        coachIds: [coachUser._id],
        coachPayoutAmount: 50,
        coachPayoutStatus: 'unpaid',
      });

      const response = await request(app)
        .patch(`/api/v1/admin/sessions/${session._id}/payout-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          payoutStatus: 'paid',
        })
        .expect(200);

      expect(response.body.session.coachPayoutStatus).toBe('paid');
    });
  });
});

