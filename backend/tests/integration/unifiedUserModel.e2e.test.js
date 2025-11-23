import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { ParentClimberLink } from '../../src/models/parentClimberLink.js';
import { ParentInfo } from '../../src/models/parentInfo.js';
import { Booking } from '../../src/models/booking.js';
import { AttendanceRecord } from '../../src/models/attendanceRecord.js';
import { Session } from '../../src/models/session.js';
import { generateToken } from '../../src/middleware/auth.js';
import { activateClimberProfile } from '../../src/services/climberActivationService.js';
import { createClimberForParent, linkExistingChildToParent } from '../../src/services/parentClimberService.js';

describe('Unified User Model E2E Tests', () => {
  let parentToken;
  let parentUser;
  let adminToken;
  let adminUser;
  let coachUser;
  let session;

  beforeAll(async () => {
    // Create parent user
    parentUser = new User({
      email: 'parent@unified.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await parentUser.save();
    parentToken = generateToken({ 
      id: parentUser._id.toString(), 
      email: parentUser.email, 
      roles: parentUser.roles 
    });

    // Create admin user
    adminUser = new User({
      email: 'admin@unified.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
      accountStatus: 'active',
    });
    await adminUser.save();
    adminToken = generateToken({ 
      id: adminUser._id.toString(), 
      email: adminUser.email, 
      roles: adminUser.roles 
    });

    // Create coach user
    coachUser = new User({
      email: 'coach@unified.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Coach',
      roles: ['coach'],
      accountStatus: 'active',
    });
    await coachUser.save();

    // Create a future session for booking/attendance tests
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    futureDate.setHours(18, 0, 0, 0);
    session = await Session.create({
      title: 'Test Session',
      date: futureDate,
      durationMinutes: 60,
      capacity: 10,
      status: 'active',
      coachIds: [coachUser._id],
    });
  });

  describe('Creating child User with inactive status', () => {
    it('should create child User with accountStatus inactive and no email/password', async () => {
      const response = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Inactive',
          lastName: 'Child',
          dateOfBirth: '2015-01-15',
        })
        .expect(201);

      expect(response.body).toHaveProperty('duplicate', false);
      expect(response.body.child).toBeDefined();
      expect(response.body.child.accountStatus).toBe('inactive');
      expect(response.body.child.email).toBeUndefined();
      expect(response.body.child.passwordHash).toBeUndefined();
      expect(response.body.child.roles).toContain('climber');
    });
  });

  describe('Duplicate checking (firstName + lastName + dateOfBirth)', () => {
    it('should detect duplicate child profile', async () => {
      // Create first child
      const firstResponse = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Duplicate',
          lastName: 'Test',
          dateOfBirth: '2010-05-20',
        })
        .expect(201);

      const firstChildId = firstResponse.body.child._id;

      // Try to create duplicate
      const duplicateResponse = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Duplicate',
          lastName: 'Test',
          dateOfBirth: '2010-05-20',
        })
        .expect(200);

      expect(duplicateResponse.body).toHaveProperty('duplicate', true);
      expect(duplicateResponse.body.existingProfile).toBeDefined();
      expect(duplicateResponse.body.existingProfile._id.toString()).toBe(firstChildId.toString());
    });

    it('should allow different children with same name but different dateOfBirth', async () => {
      const response1 = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Same',
          lastName: 'Name',
          dateOfBirth: '2010-01-01',
        })
        .expect(201);

      const response2 = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Same',
          lastName: 'Name',
          dateOfBirth: '2011-01-01',
        })
        .expect(201);

      expect(response1.body.child._id.toString()).not.toBe(response2.body.child._id.toString());
    });
  });

  describe('Linking to existing child profile', () => {
    it('should link existing child profile to parent', async () => {
      // Create child without parent (admin creates it)
      const child = await User.create({
        firstName: 'Existing',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // Parent links to existing child
      const response = await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/link-existing`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.child._id.toString()).toBe(child._id.toString());

      // Verify link exists
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: child._id,
      });
      expect(link).toBeDefined();
    });
  });

  describe('Preventing duplicate link to same parent', () => {
    it('should prevent linking same child to same parent twice', async () => {
      const child = await User.create({
        firstName: 'Single',
        lastName: 'Link',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // First link - should succeed
      await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/link-existing`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      // Second link - should fail
      await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/link-existing`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(409);
    });
  });

  describe('Preventing link if child already linked to another parent', () => {
    it('should prevent linking child that is already linked to another parent', async () => {
      // Create another parent
      const otherParent = await User.create({
        email: 'otherparent@unified.com',
        passwordHash: await User.hashPassword('password123'),
        firstName: 'Other',
        lastName: 'Parent',
        roles: ['climber'],
        accountStatus: 'active',
      });

      const child = await User.create({
        firstName: 'Linked',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // Link to other parent
      await ParentClimberLink.create({
        parentId: otherParent._id,
        climberId: child._id,
      });

      // Try to link to current parent - should fail
      await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/link-existing`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(409);
    });
  });

  describe('Activating child account with data validation', () => {
    it('should activate child account and update profile data', async () => {
      const child = await User.create({
        firstName: 'ToActivate',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      const response = await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/activate`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          email: 'activate@test.com',
          password: 'password123',
          middleName: 'Middle',
          phone: '1234567890',
        })
        .expect(200);

      expect(response.body.user.accountStatus).toBe('active');
      expect(response.body.user.email).toBe('activate@test.com');
      expect(response.body.user.middleName).toBe('Middle');
      expect(response.body.user.phone).toBe('1234567890');
    });

    it('should validate email format during activation', async () => {
      const child = await User.create({
        firstName: 'Invalid',
        lastName: 'Email',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      await request(app)
        .post(`/api/v1/parents/me/climbers/${child._id}/activate`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('Inactive accounts cannot login', () => {
    it('should reject login for inactive account', async () => {
      const inactiveUser = await User.create({
        email: 'inactive@test.com',
        passwordHash: await User.hashPassword('password123'),
        firstName: 'Inactive',
        lastName: 'User',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'password123',
        })
        .expect(401);

      expect((await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'inactive@test.com',
          password: 'password123',
        })).body.error.message).toContain('Account is inactive');
    });
  });

  describe('Password comparison with null passwordHash', () => {
    it('should handle password comparison when passwordHash is null', async () => {
      const userWithoutPassword = await User.create({
        firstName: 'No',
        lastName: 'Password',
        roles: ['climber'],
        accountStatus: 'inactive',
        // No email, no passwordHash
      });

      const result = await userWithoutPassword.comparePassword('anypassword');
      expect(result).toBe(false);
    });
  });

  describe('Admin creating children without parents', () => {
    it('should allow admin to create child without parent', async () => {
      const response = await request(app)
        .post('/api/v1/admin/children')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Admin',
          lastName: 'Child',
          dateOfBirth: '2012-03-15',
          phone: '9876543210',
        })
        .expect(201);

      expect(response.body.child).toBeDefined();
      expect(response.body.child.accountStatus).toBe('inactive');
      expect(response.body.child.roles).toContain('climber');
      expect(response.body.child.email).toBeUndefined();
    });
  });

  describe('Admin linking children to parents', () => {
    it('should allow admin to link child to parent', async () => {
      const child = await User.create({
        firstName: 'Admin',
        lastName: 'Linked',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      const response = await request(app)
        .post(`/api/v1/admin/children/${child._id}/link-parent/${parentUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.link).toBeDefined();

      // Verify link exists
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: child._id,
      });
      expect(link).toBeDefined();
    });
  });

  describe('Querying climbers (show all, not just active)', () => {
    it('should return all climbers regardless of accountStatus', async () => {
      // Create active climber
      await User.create({
        email: 'active@climber.com',
        passwordHash: await User.hashPassword('password123'),
        firstName: 'Active',
        lastName: 'Climber',
        roles: ['climber'],
        accountStatus: 'active',
      });

      // Create inactive climber
      await User.create({
        firstName: 'Inactive',
        lastName: 'Climber',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      const response = await request(app)
        .get('/api/v1/admin/climbers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.climbers.length).toBeGreaterThanOrEqual(2);
      const climberStatuses = response.body.climbers.map(c => c.accountStatus);
      expect(climberStatuses).toContain('active');
      expect(climberStatuses).toContain('inactive');
    });
  });


  describe('Parent-child relationships', () => {
    it('should maintain parent-child link after activation', async () => {
      const child = await User.create({
        firstName: 'Linked',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      // Activate child
      await activateClimberProfile(
        child._id,
        'linked@test.com',
        'password123',
        parentUser._id
      );

      // Verify link still exists
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: child._id,
      });
      expect(link).toBeDefined();
    });
  });

  describe('Bookings with User instead of Climber', () => {
    it('should create booking for User with climber role', async () => {
      const child = await User.create({
        firstName: 'Booking',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: child._id.toString(),
        })
        .expect(201);

      expect(response.body.booking.climberId.toString()).toBe(child._id.toString());
    });
  });

  describe('Attendance with User instead of Climber', () => {
    it('should record attendance for User with climber role', async () => {
      const child = await User.create({
        firstName: 'Attendance',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // Create booking first
      await Booking.create({
        sessionId: session._id,
        climberId: child._id,
        bookedById: parentUser._id,
        status: 'booked',
      });

      const coachToken = generateToken({ 
        id: coachUser._id.toString(), 
        email: coachUser.email, 
        roles: coachUser.roles 
      });

      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sessionId: session._id.toString(),
          climberId: child._id.toString(),
          status: 'present',
        })
        .expect(201);

      expect(response.body.attendance.climberId.toString()).toBe(child._id.toString());
    });
  });

  describe('Multiple parents per child via ParentInfo', () => {
    it('should allow multiple ParentInfo records for same child', async () => {
      const child = await User.create({
        firstName: 'Multi',
        lastName: 'Parent',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      // Create first parent info
      const parentInfo1 = await ParentInfo.create({
        climberId: child._id,
        parentName: 'First Parent',
        parentPhone: '1111111111',
        isPrimaryContact: true,
      });

      // Create second parent info
      const parentInfo2 = await ParentInfo.create({
        climberId: child._id,
        parentName: 'Second Parent',
        parentPhone: '2222222222',
        isPrimaryContact: false,
      });

      expect(parentInfo1._id.toString()).not.toBe(parentInfo2._id.toString());

      // Verify both exist
      const allParentInfo = await ParentInfo.find({ climberId: child._id });
      expect(allParentInfo.length).toBe(2);
    });
  });

  describe('Three-name structure', () => {
    it('should handle firstName, middleName, lastName correctly', async () => {
      const child = await User.create({
        firstName: 'First',
        middleName: 'Middle',
        lastName: 'Last',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      expect(child.firstName).toBe('First');
      expect(child.middleName).toBe('Middle');
      expect(child.lastName).toBe('Last');

      // Test full name construction
      const fullName = `${child.firstName} ${child.middleName || ''} ${child.lastName}`.trim();
      expect(fullName).toBe('First Middle Last');
    });

    it('should handle missing middleName', async () => {
      const child = await User.create({
        firstName: 'First',
        lastName: 'Last',
        roles: ['climber'],
        accountStatus: 'inactive',
      });

      expect(child.middleName).toBeNull();
      const fullName = `${child.firstName} ${child.middleName || ''} ${child.lastName}`.trim();
      expect(fullName).toBe('First Last');
    });
  });

  describe('Photo and club membership fields', () => {
    it('should store photo and photoHistory', async () => {
      const child = await User.create({
        firstName: 'Photo',
        lastName: 'Test',
        roles: ['climber'],
        accountStatus: 'inactive',
        photo: 'https://example.com/photo1.jpg',
        photoHistory: [
          'https://example.com/photo0.jpg',
        ],
      });

      expect(child.photo).toBe('https://example.com/photo1.jpg');
      expect(child.photoHistory).toHaveLength(1);
    });

    it('should store club membership information', async () => {
      const child = await User.create({
        firstName: 'Member',
        lastName: 'Test',
        roles: ['climber'],
        accountStatus: 'inactive',
        clubMembership: {
          isCurrentMember: true,
          membershipHistory: [
            { year: 2023, wasMember: true },
            { year: 2024, wasMember: true },
          ],
        },
      });

      expect(child.clubMembership.isCurrentMember).toBe(true);
      expect(child.clubMembership.membershipHistory).toHaveLength(2);
      expect(child.clubMembership.membershipHistory[0].year).toBe(2023);
    });
  });

  describe('Manual removal of ParentClimberLink', () => {
    it('should allow removing ParentClimberLink for activated child', async () => {
      const child = await User.create({
        email: 'removable@test.com',
        passwordHash: await User.hashPassword('password123'),
        firstName: 'Removable',
        lastName: 'Child',
        roles: ['climber'],
        accountStatus: 'active',
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      const response = await request(app)
        .delete(`/api/v1/parents/me/climbers/${child._id}/link`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.message).toContain('removed successfully');

      // Verify link is removed
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: child._id,
      });
      expect(link).toBeNull();
    });

    it('should prevent removing link for inactive child', async () => {
      const child = await User.create({
        firstName: 'Inactive',
        lastName: 'Link',
        roles: ['climber'],
        accountStatus: 'inactive',
        // No email
      });

      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      await request(app)
        .delete(`/api/v1/parents/me/climbers/${child._id}/link`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(400);

      // Verify link still exists
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: child._id,
      });
      expect(link).toBeDefined();
    });
  });
});

