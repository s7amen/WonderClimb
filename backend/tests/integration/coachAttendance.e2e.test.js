import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { Session } from '../../src/models/session.js';
import { Booking } from '../../src/models/booking.js';
import { AttendanceRecord } from '../../src/models/attendanceRecord.js';
import { generateToken } from '../../src/middleware/auth.js';

describe('Coach Attendance E2E Tests', () => {
  let coachToken;
  let coachUser;
  let parentUser;
  let climber;
  let session;
  let booking;

  beforeAll(async () => {
    // Create coach user
    coachUser = new User({
      email: 'coach@attendance.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Coach',
      roles: ['coach'],
      accountStatus: 'active',
    });
    await coachUser.save();
    coachToken = generateToken({ id: coachUser._id.toString(), email: coachUser.email, roles: coachUser.roles });

    // Create parent user
    parentUser = new User({
      email: 'parent@attendance.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await parentUser.save();

    // Create child User
    climber = await User.create({
      firstName: 'Attendance',
      lastName: 'Test',
      roles: ['climber'],
      accountStatus: 'inactive',
    });

    // Create today's session
    const today = new Date();
    today.setHours(18, 0, 0, 0);

    session = await Session.create({
      title: 'Today\'s Session',
      date: today,
      durationMinutes: 60,
      capacity: 10,
      status: 'active',
      coachIds: [coachUser._id],
      coachPayoutAmount: 50,
      coachPayoutStatus: 'unpaid',
    });

    // Create booking
    booking = await Booking.create({
      sessionId: session._id,
      climberId: climber._id,
      bookedById: parentUser._id,
      status: 'booked',
    });
  });

  describe('GET /api/v1/coaches/me/sessions/today', () => {
    it('should return today\'s sessions for coach', async () => {
      const response = await request(app)
        .get('/api/v1/coaches/me/sessions/today')
        .set('Authorization', `Bearer ${coachToken}`)
        .expect(200);

      expect(response.body.sessions).toBeDefined();
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/v1/coaches/me/sessions/today')
        .expect(401);
    });
  });

  describe('POST /api/v1/attendance', () => {
    it('should record attendance for a climber', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: climber._id.toString(),
          status: 'present',
        })
        .expect(201);

      expect(response.body.attendance).toBeDefined();
      expect(response.body.attendance.status).toBe('present');
      expect(response.body.attendance.climberId).toBe(climber._id.toString());
    });

    it('should update attendance if already recorded', async () => {
      // Record again with different status
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: climber._id.toString(),
          status: 'absent',
        })
        .expect(201);

      expect(response.body.attendance.status).toBe('absent');
    });

    it('should reject attendance for unbooked climber', async () => {
      const otherClimber = await User.create({
        firstName: 'Other',
        lastName: 'Climber',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: otherClimber._id.toString(),
          status: 'present',
        })
        .expect(400);
    });
  });
});

