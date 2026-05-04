import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/repositories/prismaClient.js';
import { TEST_ADMIN_ID, TEST_OTHER_USER_ID, TEST_USER_ID, app, authHeader, createMovie, createTestUser, resetStore } from './testUtils.js';

describe('audit logging', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('creates audit log entries for register and login', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Tony Stark',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'tony@example.com',
      password: 'password123',
    });

    expect(loginResponse.status).toBe(200);

    const logs = await prisma.auditLog.findMany({
      where: { userId: registerResponse.body.user.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs).toEqual([
      expect.objectContaining({
        roleName: 'USER',
        actionType: 'AUTH_REGISTER',
        entityType: 'USER',
        entityId: registerResponse.body.user.id,
      }),
      expect.objectContaining({
        roleName: 'USER',
        actionType: 'AUTH_LOGIN',
        entityType: 'USER',
        entityId: registerResponse.body.user.id,
      }),
    ]);
  });

  it('creates audit log entries for movie create, update, and delete', async () => {
    const created = await createMovie();

    const updated = await request(app)
      .put(`/api/movies/${created.body.id}`)
      .set(authHeader())
      .send({
        movieName: 'Interstellar',
        watchDate: '2025-01-11',
        rating: 5,
        review: 'Masterpiece',
        movieLink: 'https://example.com/interstellar',
      });

    expect(updated.status).toBe(200);

    const deleted = await request(app)
      .delete(`/api/movies/${created.body.id}`)
      .set(authHeader());

    expect(deleted.status).toBe(204);

    const logs = await prisma.auditLog.findMany({
      where: { userId: TEST_USER_ID },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.map((log) => ({
      actionType: log.actionType,
      entityType: log.entityType,
      entityId: log.entityId,
    }))).toEqual([
      {
        actionType: 'MOVIE_CREATE',
        entityType: 'MOVIE',
        entityId: created.body.id,
      },
      {
        actionType: 'MOVIE_UPDATE',
        entityType: 'MOVIE',
        entityId: created.body.id,
      },
      {
        actionType: 'MOVIE_DELETE',
        entityType: 'MOVIE',
        entityId: created.body.id,
      },
    ]);
  });

  it('creates an audit log entry when an admin deletes another user', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });

    const response = await request(app)
      .delete(`/api/users/${TEST_OTHER_USER_ID}`)
      .set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(response.status).toBe(200);

    const log = await prisma.auditLog.findFirstOrThrow({
      where: {
        userId: TEST_ADMIN_ID,
        actionType: 'ADMIN_DELETE_USER',
        entityId: TEST_OTHER_USER_ID,
      },
    });

    expect(log).toMatchObject({
      roleName: 'ADMIN',
      entityType: 'USER',
    });
  });
});
