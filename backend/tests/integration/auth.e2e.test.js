import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/user.js';

describe('Authentication E2E Tests', () => {
  const testUser = {
    email: 'test@auth.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    // roles are auto-assigned as 'climber' during registration
  };

  beforeEach(async () => {
    // Clean up test user if exists
    await User.deleteOne({ email: testUser.email });
  });

  afterEach(async () => {
    // Clean up test user
    await User.deleteOne({ email: testUser.email });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).toHaveProperty('roles');
      expect(response.body.user.roles).toContain('climber');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email', async () => {
      // Create user first
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.error.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBe('Validation failed');
      expect(response.body.error.errors).toBeInstanceOf(Array);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body.error.errors).toContainEqual(
        expect.stringContaining('valid email address')
      );
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          password: '12345', // Too short
        })
        .expect(400);

      expect(response.body.error.errors).toContainEqual(
        expect.stringContaining('at least 6 characters')
      );
    });

    // Roles are auto-assigned, so this test is no longer valid
    // Removing roles validation test since roles are auto-assigned as 'climber'
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create user for login tests
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('firstName', testUser.firstName);
      expect(response.body.user).toHaveProperty('lastName', testUser.lastName);
      expect(response.body.user).toHaveProperty('roles');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('JWT Token Usage', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get token
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      authToken = loginResponse.body.token;
    });

    it('should allow access to protected endpoints with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/parents/me/climbers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/v1/parents/me/climbers')
        .expect(401);

      expect(response.body.error.message).toContain('Authentication required');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/parents/me/climbers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.message).toContain('Invalid or expired token');
    });
  });
});

