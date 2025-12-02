import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { Session } from '../../src/models/session.js';
import { Booking } from '../../src/models/booking.js';
import { ParentClimberLink } from '../../src/models/parentClimberLink.js';
import { generateToken } from '../../src/middleware/auth.js';

describe('Parent Booking E2E Tests', () => {
  let parentToken;
  let parentUser;
  let coachUser;
  let climber;
  let session;
  let futureSession;

  beforeAll(async () => {
    // Create parent user
    parentUser = new User({
      email: 'parent@booking.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Booking',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await parentUser.save();
    parentToken = generateToken({ id: parentUser._id.toString(), email: parentUser.email, roles: parentUser.roles });

    // Create coach user
    coachUser = new User({
      email: 'coach@booking.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Coach',
      roles: ['coach'],
      accountStatus: 'active',
    });
    await coachUser.save();

    // Create child User for parent
    climber = await User.create({
      firstName: 'Booking',
      lastName: 'Child',
      roles: ['climber'],
      accountStatus: 'inactive',
    });
    await ParentClimberLink.create({
      parentId: parentUser._id,
      climberId: climber._id,
    });

    // Create a future session
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5); // 5 days from now
    futureDate.setHours(18, 0, 0, 0);

    session = await Session.create({
      title: 'Test Session',
      date: futureDate,
      durationMinutes: 60,
      capacity: 10,
      status: 'active',
      coachIds: [coachUser._id],
    });

    // Create another future session for recurring booking test
    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 7);
    futureDate2.setHours(18, 0, 0, 0);

    futureSession = await Session.create({
      title: 'Future Session',
      date: futureDate2,
      durationMinutes: 60,
      capacity: 10,
      status: 'active',
      coachIds: [coachUser._id],
    });

    // Verify session creation
    const createdSession = await Session.findById(session._id);
    if (!createdSession) {
      throw new Error('Session not created in beforeAll');
    }
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a booking for parent\'s child', async () => {
      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: climber._id.toString(),
        })
        .expect(201);

      expect(response.body.booking).toBeDefined();
      expect(response.body.booking.status).toBe('booked');
      expect(response.body.booking.climberId).toBe(climber._id.toString());
      expect(response.body.booking.sessionId).toBe(session._id.toString());
    });

    it('should reject duplicate booking', async () => {
      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: climber._id.toString(),
        })
        .expect(409); // Conflict
    });

    it('should reject booking without authentication', async () => {
      await request(app)
        .post('/api/v1/bookings')
        .send({
          sessionId: session._id.toString(),
          climberId: climber._id.toString(),
        })
        .expect(401);
    });

    it('should reject booking for session outside booking horizon', async () => {
      // Create a session far in the future (beyond 30 days)
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 35);
      farFutureDate.setHours(18, 0, 0, 0);

      const farSession = await Session.create({
        title: 'Far Future Session',
        date: farFutureDate,
        durationMinutes: 60,
        capacity: 10,
        status: 'active',
        coachIds: [coachUser._id],
      });

      await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          sessionId: farSession._id.toString(),
          climberId: climber._id.toString(),
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/parents/me/bookings', () => {
    it('should return bookings for parent\'s children', async () => {
      const response = await request(app)
        .get('/api/v1/parents/me/bookings')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.bookings).toBeDefined();
      expect(Array.isArray(response.body.bookings)).toBe(true);
      expect(response.body.bookings.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/v1/bookings/:bookingId', () => {
    it('should cancel a booking within cancellation window', async () => {
      // Create a booking for a session far enough in the future
      const booking = await Booking.create({
        sessionId: futureSession._id,
        climberId: climber._id,
        bookedById: parentUser._id,
        status: 'booked',
      });

      const response = await request(app)
        .delete(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.booking.status).toBe('cancelled');
      expect(response.body.booking.cancelledAt).toBeDefined();
    });

    it('should reject cancellation outside cancellation window', async () => {
      // Create a session very soon (within cancellation window)
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 2); // 2 hours from now (within 4h window)

      const soonSession = await Session.create({
        title: 'Soon Session',
        date: soonDate,
        durationMinutes: 60,
        capacity: 10,
        status: 'active',
        coachIds: [coachUser._id],
      });

      const booking = await Booking.create({
        sessionId: soonSession._id,
        climberId: climber._id,
        bookedById: parentUser._id,
        status: 'booked',
      });

      await request(app)
        .delete(`/api/v1/bookings/${booking._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(400); // Cancellation window passed
    });
  });
});

