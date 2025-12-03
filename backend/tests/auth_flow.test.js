import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/user.js';
import { RefreshToken } from '../src/models/refreshToken.js';

// Import express app WITHOUT auto-connecting to DB
import express from 'express';
import cookieParser from 'cookie-parser';
import apiRoutes from '../src/routes/index.js';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';

let mongoServer;
let app;

beforeAll(async () => {
    // Create in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Disconnect any existing connections
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use('/api/v1', apiRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    // Clean up between tests if needed
    // await User.deleteMany({});
    // await RefreshToken.deleteMany({});
});

describe('Auth Flow', () => {
    let cookies;
    let accessToken;
    let oldCookies; // Define at suite level
    const testUser = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'
    };

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');

        // Check for refresh token cookie
        const cookie = res.headers['set-cookie'];
        expect(cookie).toBeDefined();
        expect(cookie[0]).toMatch(/refreshToken=/);

        cookies = cookie;
        accessToken = res.body.accessToken;
    });

    it('should login', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken');

        const cookie = res.headers['set-cookie'];
        expect(cookie).toBeDefined();
        cookies = cookie; // Update cookies
    });

    it('should refresh token', async () => {
        // Wait a bit to ensure timestamps differ
        await new Promise(resolve => setTimeout(resolve, 100));

        oldCookies = cookies; // Save old cookies

        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', cookies);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('accessToken');

        const newCookie = res.headers['set-cookie'];
        expect(newCookie).toBeDefined();
        expect(newCookie[0]).not.toEqual(cookies[0]); // Should be different (rolling)

        cookies = newCookie;
    });

    it('should fail with old refresh token (reuse detection)', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', oldCookies);

        if (res.statusCode !== 401) {
            console.log('Reuse detection failed:', res.statusCode, res.body);
        }
        expect(res.statusCode).toEqual(401);
        expect(res.body.error.message).toMatch(/revoked|invalid/i);
    });

    it('should logout', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Cookie', cookies);

        expect(res.statusCode).toEqual(200);
        expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/); // Should be cleared
    });

    it('should fail refresh after logout', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .set('Cookie', cookies); // Using the cookie we had before logout (which is now revoked in DB)

        if (res.statusCode !== 401) {
            console.log('Refresh after logout failed:', res.statusCode, res.body);
        }
        expect(res.statusCode).toEqual(401);
    });
});
