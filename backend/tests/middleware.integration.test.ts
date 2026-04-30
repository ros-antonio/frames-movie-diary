import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './testUtils.js';

describe('auth middleware', () => {
    it('rejects requests missing X-User-Id header on protected routes', async () => {
        const response = await request(app).get('/api/movies');
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('User ID is required');
    });

    it('allows access to public endpoints without headers', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
    });
});