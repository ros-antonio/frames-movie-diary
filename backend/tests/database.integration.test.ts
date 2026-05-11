import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/repositories/prismaClient.js';
import {
  ADMIN_PERMISSIONS,
  TEST_ADMIN_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  USER_PERMISSIONS,
  app,
  authCookie,
  authHeader,
  createList,
  createMovie,
  createTestUser,
  resetStore,
} from './testUtils.js';

describe('database role and ownership behavior', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('creates users with roles and links roles to permissions', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: TEST_USER_ID },
      include: { role: { include: { permissions: true } } },
    });

    const admin = await prisma.user.findUniqueOrThrow({
      where: { id: TEST_ADMIN_ID },
      include: { role: { include: { permissions: true } } },
    });

    expect(user.role.name).toBe('USER');
    expect(user.role.permissions.map((permission) => permission.name).sort()).toEqual([...USER_PERMISSIONS].sort());
    expect(admin.role.name).toBe('ADMIN');
    expect(admin.role.permissions.map((permission) => permission.name).sort()).toEqual([...ADMIN_PERMISSIONS].sort());
  });

  it('allows admins to list another user movies and lists', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });
    const ownMovie = await createMovie({ movieName: 'Own Movie', watchDate: '2025-01-01' });
    const otherMovie = await createMovie({ movieName: 'Other Movie', watchDate: '2025-01-02' }, TEST_OTHER_USER_ID);
    const ownList = await createList({ name: 'Own List' });
    const otherList = await createList({ name: 'Other List' }, TEST_OTHER_USER_ID);

    const movies = await request(app).get('/api/movies?page=1&pageSize=100').set(authHeader(TEST_ADMIN_ID, 'ADMIN'));
    const lists = await request(app).get('/api/lists?page=1&pageSize=100').set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(movies.status).toBe(200);
    expect(movies.body.data.map((movie: { id: string }) => movie.id)).toEqual(
      expect.arrayContaining([ownMovie.body.id, otherMovie.body.id]),
    );
    expect(lists.status).toBe(200);
    expect(lists.body.data.map((list: { id: string }) => list.id)).toEqual(
      expect.arrayContaining([ownList.body.id, otherList.body.id]),
    );
  });

  it('prevents normal users from reading or mutating another user records', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });
    const otherMovie = await createMovie({ movieName: 'Other Movie', watchDate: '2025-01-02' }, TEST_OTHER_USER_ID);
    const otherList = await createList({ name: 'Other List' }, TEST_OTHER_USER_ID);

    const fetchMovie = await request(app).get(`/api/movies/${otherMovie.body.id}`).set(authHeader(TEST_USER_ID));
    const updateMovie = await request(app)
      .put(`/api/movies/${otherMovie.body.id}`)
      .set(authHeader(TEST_USER_ID))
      .send({ movieName: 'Stolen', watchDate: '2025-01-03' });
    const fetchList = await request(app).get(`/api/lists/${otherList.body.id}`).set(authHeader(TEST_USER_ID));
    const deleteList = await request(app).delete(`/api/lists/${otherList.body.id}`).set(authHeader(TEST_USER_ID));

    expect(fetchMovie.status).toBe(404);
    expect(updateMovie.status).toBe(404);
    expect(fetchList.status).toBe(404);
    expect(deleteList.status).toBe(404);
  });

  it('cascades deletes across users, movies, frames, lists, and memberships', async () => {
    const movie = await createMovie();
    const list = await createList();

    const frame = await request(app)
      .post(`/api/movies/${movie.body.id}/frames`)
      .set(authHeader())
      .send({
        imageUrl: 'data:image/png;base64,abc123',
        timestamp: '00:10',
        caption: 'Frame',
      });

    await request(app).post(`/api/lists/${list.body.id}/movies/${movie.body.id}`).set(authHeader());
    await prisma.user.delete({ where: { id: TEST_USER_ID } });

    await expect(prisma.movie.findUnique({ where: { id: movie.body.id } })).resolves.toBeNull();
    await expect(prisma.frame.findUnique({ where: { id: frame.body.id } })).resolves.toBeNull();
    await expect(prisma.customList.findUnique({ where: { id: list.body.id } })).resolves.toBeNull();
    await expect(prisma.listMovie.count()).resolves.toBe(0);
  });

  it('supports auth via HttpOnly cookie token and rejects malformed tokens', async () => {
    const ok = await request(app).get('/api/movies').set('Cookie', authCookie(TEST_USER_ID));
    const bad = await request(app).get('/api/movies').set('Authorization', 'Bearer not-a-valid-token');

    expect(ok.status).toBe(200);
    expect(bad.status).toBe(401);
    expect(bad.body.message).toBe('Invalid or expired token');
  });

  it('exposes admin-only users with role and permission data', async () => {
    const forbidden = await request(app).get('/api/users').set(authHeader(TEST_USER_ID, 'USER'));
    const allowed = await request(app).get('/api/users').set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: TEST_ADMIN_ID,
          role: 'ADMIN',
          permissions: expect.arrayContaining(['ADMIN_VIEW_USERS', 'ADMIN_DELETE_USERS', 'MOVIE_READ_ALL']),
        }),
        expect.objectContaining({
          id: TEST_USER_ID,
          role: 'USER',
          permissions: expect.arrayContaining(['MOVIE_READ_OWN', 'LIST_WRITE_OWN']),
        }),
      ]),
    );
  });

  it('exposes suspicious users to admins only', async () => {
    await prisma.suspiciousUser.create({
      data: {
        userId: TEST_USER_ID,
        reason: 'REPEATED_FAILED_LOGINS',
        score: 3,
        status: 'OBSERVED',
      },
    });

    const forbidden = await request(app).get('/api/users/suspicious').set(authHeader(TEST_USER_ID, 'USER'));
    const allowed = await request(app).get('/api/users/suspicious').set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: TEST_USER_ID,
          userEmail: 'testuser@example.com',
          role: 'USER',
          reason: 'REPEATED_FAILED_LOGINS',
          score: 3,
          status: 'OBSERVED',
        }),
      ]),
    );
  });

  it('allows admin to delete another user and cascades all owned data', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other User',
    });

    const movie = await createMovie({ movieName: 'Other Movie', watchDate: '2025-01-02' }, TEST_OTHER_USER_ID);
    const list = await createList({ name: 'Other List' }, TEST_OTHER_USER_ID);
    const frame = await request(app)
      .post(`/api/movies/${movie.body.id}/frames`)
      .set(authHeader(TEST_OTHER_USER_ID))
      .send({
        imageUrl: 'data:image/png;base64,abc123',
        timestamp: '00:10',
        caption: 'Frame',
      });

    await request(app).post(`/api/lists/${list.body.id}/movies/${movie.body.id}`).set(authHeader(TEST_OTHER_USER_ID));

    const response = await request(app)
      .delete(`/api/users/${TEST_OTHER_USER_ID}`)
      .set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'User deleted successfully',
        deletedUserId: TEST_OTHER_USER_ID,
        deletedUserEmail: 'other@example.com',
        deletedMovieCount: 1,
        deletedListCount: 1,
      }),
    );

    await expect(prisma.user.findUnique({ where: { id: TEST_OTHER_USER_ID } })).resolves.toBeNull();
    await expect(prisma.movie.findUnique({ where: { id: movie.body.id } })).resolves.toBeNull();
    await expect(prisma.frame.findUnique({ where: { id: frame.body.id } })).resolves.toBeNull();
    await expect(prisma.customList.findUnique({ where: { id: list.body.id } })).resolves.toBeNull();
  });

  it('blocks admin self-delete', async () => {
    const response = await request(app)
      .delete(`/api/users/${TEST_ADMIN_ID}`)
      .set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Admins cannot delete their own account');
  });
});
