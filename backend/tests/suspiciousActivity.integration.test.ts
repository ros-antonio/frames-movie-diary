import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/repositories/prismaClient.js';
import { TEST_ADMIN_ID, TEST_USER_ID, app, authHeader, createMovie, resetStore } from './testUtils.js';

describe('suspicious activity detection', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('flags repeated failed logins for a known user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    for (let index = 0; index < 3; index += 1) {
      const response = await request(app).post('/api/auth/login').send({
        email: 'tony@example.com',
        password: 'wrong-password',
      });

      expect(response.status).toBe(401);
    }

    const flaggedUser = await prisma.suspiciousUser.findFirstOrThrow({
      where: { reason: 'REPEATED_FAILED_LOGINS' },
      include: { user: true },
    });

    expect(flaggedUser.user.email).toBe('tony@example.com');
    expect(flaggedUser.score).toBeGreaterThanOrEqual(3);
  });

  it('flags repeated forbidden actions', async () => {
    for (let index = 0; index < 3; index += 1) {
      const response = await request(app)
        .get('/api/users')
        .set(authHeader(TEST_USER_ID, 'USER'));

      expect(response.status).toBe(403);
    }

    const flaggedUser = await prisma.suspiciousUser.findFirstOrThrow({
      where: {
        userId: TEST_USER_ID,
        reason: 'REPEATED_FORBIDDEN_ACTIONS',
      },
    });

    expect(flaggedUser.score).toBeGreaterThanOrEqual(3);
  });

  it('flags high delete activity', async () => {
    const createdMovies = [];

    for (let index = 0; index < 4; index += 1) {
      createdMovies.push(await createMovie({
        movieName: `Movie ${index + 1}`,
        watchDate: `2025-01-0${index + 1}`,
      }));
    }

    for (const movie of createdMovies) {
      const response = await request(app)
        .delete(`/api/movies/${movie.body.id}`)
        .set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

      expect(response.status).toBe(204);
    }

    const flaggedUser = await prisma.suspiciousUser.findFirstOrThrow({
      where: {
        userId: TEST_ADMIN_ID,
        reason: 'HIGH_DELETE_ACTIVITY',
      },
    });

    expect(flaggedUser.score).toBeGreaterThanOrEqual(4);
  });
});
