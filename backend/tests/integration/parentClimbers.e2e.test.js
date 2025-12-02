import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';
import { ParentClimberLink } from '../../src/models/parentClimberLink.js';
import { generateToken } from '../../src/middleware/auth.js';

describe('Parent Climbers E2E Tests', () => {
  let parentToken;
  let parentUser;
  let otherParentToken;
  let otherParentUser;

  beforeAll(async () => {
    // Create parent user
    parentUser = new User({
      email: 'parent@test.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await parentUser.save();
    parentToken = generateToken({ id: parentUser._id.toString(), email: parentUser.email, roles: parentUser.roles });

    // Create another parent user
    otherParentUser = new User({
      email: 'otherparent@test.com',
      passwordHash: await User.hashPassword('password123'),
      firstName: 'Other',
      lastName: 'Parent',
      roles: ['climber'],
      accountStatus: 'active',
    });
    await otherParentUser.save();
    otherParentToken = generateToken({ id: otherParentUser._id.toString(), email: otherParentUser.email, roles: otherParentUser.roles });
  });

  describe('POST /api/v1/parents/me/climbers', () => {
    it('should create a climber and link it to parent', async () => {
      const response = await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '2015-05-15',
          notes: 'Test climber',
        })
        .expect(201);

      expect(response.body).toHaveProperty('duplicate', false);
      expect(response.body.child).toBeDefined();
      expect(response.body.child.firstName).toBe('John');
      expect(response.body.child.lastName).toBe('Doe');

      // Verify link exists
      const link = await ParentClimberLink.findOne({
        parentId: parentUser._id,
        climberId: response.body.child._id,
      });
      expect(link).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .post('/api/v1/parents/me/climbers')
        .send({
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(401);
    });

    it('should reject request with missing required fields', async () => {
      await request(app)
        .post('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'John',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/parents/me/climbers', () => {
    it('should return only climbers linked to the authenticated parent', async () => {
      // Create child User for parent
      const child1 = await User.create({
        firstName: 'Child1',
        lastName: 'Parent1',
        roles: ['climber'],
        accountStatus: 'inactive',
      });
      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child1._id,
      });

      // Create child User for other parent
      const child2 = await User.create({
        firstName: 'Child2',
        lastName: 'Parent2',
        roles: ['climber'],
        accountStatus: 'inactive',
      });
      await ParentClimberLink.create({
        parentId: otherParentUser._id,
        climberId: child2._id,
      });

      const response = await request(app)
        .get('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.climbers).toBeDefined();
      expect(response.body.climbers.length).toBeGreaterThan(0);
      // Verify parent only sees their own climbers
      const climberIds = response.body.climbers.map(c => c._id.toString());
      expect(climberIds).toContain(child1._id.toString());
      expect(climberIds).not.toContain(child2._id.toString());
    });
  });

  describe('PUT /api/v1/parents/me/climbers/:climberId', () => {
    it('should update child if linked to parent', async () => {
      const child = await User.create({
        firstName: 'Original',
        lastName: 'Name',
        roles: ['climber'],
        accountStatus: 'inactive',
      });
      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      const response = await request(app)
        .put(`/api/v1/parents/me/climbers/${child._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Updated',
        })
        .expect(200);

      expect(response.body.climber.firstName).toBe('Updated');
    });

    it('should reject update if child not linked to parent', async () => {
      const child = await User.create({
        firstName: 'Other',
        lastName: 'Climber',
        roles: ['climber'],
        accountStatus: 'inactive',
      });
      await ParentClimberLink.create({
        parentId: otherParentUser._id,
        climberId: child._id,
      });

      await request(app)
        .put(`/api/v1/parents/me/climbers/${child._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .send({
          firstName: 'Updated',
        })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/parents/me/climbers/:climberId', () => {
    it('should deactivate child if linked to parent', async () => {
      const child = await User.create({
        firstName: 'ToDelete',
        lastName: 'Climber',
        roles: ['climber'],
        accountStatus: 'active',
      });
      await ParentClimberLink.create({
        parentId: parentUser._id,
        climberId: child._id,
      });

      const response = await request(app)
        .delete(`/api/v1/parents/me/climbers/${child._id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/deleted|removed|success/i);

      // Verify child is inactive in DB
      const deletedChild = await User.findById(child._id);
      expect(deletedChild.accountStatus).toBe('inactive');
    });
  });
});

