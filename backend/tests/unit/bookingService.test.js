import { describe, it, expect, beforeEach } from '@jest/globals';
import { createBooking, cancelBooking } from '../../src/services/bookingService.js';
import { Session } from '../../src/models/session.js';
import { Booking } from '../../src/models/booking.js';
import { User } from '../../src/models/user.js';

describe('BookingService Unit Tests', () => {
  let session, climber, user;

  beforeEach(async () => {
    // Create test data
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    futureDate.setHours(18, 0, 0, 0);

    user = await User.create({
      email: 'test@booking.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'User',
      roles: ['climber'],
      accountStatus: 'active',
    });

    session = await Session.create({
      title: 'Test Session',
      date: futureDate,
      durationMinutes: 60,
      capacity: 2,
      status: 'active',
      coachIds: [user._id],
    });

    climber = await User.create({
      firstName: 'Test',
      lastName: 'Climber',
      roles: ['climber'],
      accountStatus: 'active',
    });
  });

  describe('createBooking', () => {
    it('should create a booking when capacity is available', async () => {
      const booking = await createBooking(
        session._id.toString(),
        climber._id.toString(),
        user._id.toString(),
        ['climber']
      );

      expect(booking).toBeDefined();
      expect(booking.status).toBe('booked');
    });

    it('should prevent duplicate bookings', async () => {
      await createBooking(
        session._id.toString(),
        climber._id.toString(),
        user._id.toString(),
        ['climber']
      );

      await expect(
        createBooking(
          session._id.toString(),
          climber._id.toString(),
          user._id.toString(),
          ['climber']
        )
      ).rejects.toThrow();
    });

    it('should enforce capacity limits', async () => {
      // Fill capacity
      const climber2 = await User.create({
        firstName: 'Test2',
        lastName: 'Climber2',
        roles: ['climber'],
        accountStatus: 'active',
      });

      await createBooking(
        session._id.toString(),
        climber._id.toString(),
        user._id.toString(),
        ['climber']
      );

      await createBooking(
        session._id.toString(),
        climber2._id.toString(),
        user._id.toString(),
        ['climber']
      );

      // Third booking should fail
      const climber3 = await User.create({
        firstName: 'Test3',
        lastName: 'Climber3',
        roles: ['climber'],
        accountStatus: 'active',
      });

      await expect(
        createBooking(
          session._id.toString(),
          climber3._id.toString(),
          user._id.toString(),
          ['climber']
        )
      ).rejects.toThrow();
    });
  });
});

