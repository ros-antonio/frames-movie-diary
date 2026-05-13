import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, authCookie, authHeader, resetStore, TEST_USER_ID } from './testUtils.js';
import { config } from '../src/config.js';
import { prisma } from '../src/repositories/prismaClient.js';
import { USER_PERMISSIONS } from '../src/utils/permissions.js';

describe('auth middleware', () => {
    beforeEach(async () => {
        await resetStore();
    });

    it('rejects requests missing bearer token on protected routes', async () => {
        const response = await request(app).get('/api/movies');
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Authentication required: Missing or invalid token');
    });

    it('allows access to public endpoints without headers', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
    });

    it('accepts cookie-based authentication on protected routes', async () => {
        const response = await request(app)
            .get('/api/movies')
            .set('Cookie', authCookie());

        expect(response.status).toBe(200);
    });

    it('rejects malformed tokens on protected routes', async () => {
        const response = await request(app)
            .get('/api/movies')
            .set({ Authorization: 'Bearer definitely-not-a-jwt' });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('rejects stale session versions after security state changes', async () => {
        await prisma.user.update({
            where: { id: TEST_USER_ID },
            data: { sessionVersion: { increment: 1 } },
        });

        const response = await request(app)
            .get('/api/movies')
            .set(authHeader());

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('rejects tokens for deleted users', async () => {
        await prisma.user.delete({
            where: { id: TEST_USER_ID },
        });

        const response = await request(app)
            .get('/api/movies')
            .set(authHeader());

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid or expired token');
    });

    it('refreshes the auth cookie when using cookie authentication', async () => {
        const response = await request(app)
            .get('/api/movies')
            .set('Cookie', authCookie());

        expect(response.status).toBe(200);
        expect(response.headers['set-cookie']).toEqual(
            expect.arrayContaining([expect.stringContaining('frames_auth=')]),
        );
    });

    it('prefers a valid bearer token over a bad cookie token', async () => {
        const validToken = jwt.sign({
            userId: TEST_USER_ID,
            role: 'USER',
            permissions: USER_PERMISSIONS,
            sessionVersion: 1,
        }, config.jwtSecret, { expiresIn: '1h' });

        const response = await request(app)
            .get('/api/movies')
            .set({
                Authorization: `Bearer ${validToken}`,
                Cookie: 'frames_auth=bad-cookie-token',
            });

        expect(response.status).toBe(200);
    });
});
