import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { prisma } from '../src/repositories/prismaClient.js';
import { config } from '../src/config.js';
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from '../src/utils/permissions.js';

export const app = createApp();

export const TEST_USER_ID = 'test-user-123';
export const TEST_ROLE_ID = 'test-role-user';
export const TEST_ADMIN_ID = 'test-admin-123';
export const TEST_ADMIN_ROLE_ID = 'test-role-admin';
export const TEST_OTHER_USER_ID = 'test-user-456';
export { ADMIN_PERMISSIONS, USER_PERMISSIONS };

export function authHeader(userId = TEST_USER_ID, role: 'USER' | 'ADMIN' = 'USER') {
  const permissions = role === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [...USER_PERMISSIONS];
  const token = jwt.sign({ userId, role, permissions, sessionVersion: 1 }, config.jwtSecret, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}` };
}

export function authCookie(userId = TEST_USER_ID, role: 'USER' | 'ADMIN' = 'USER') {
  const permissions = role === 'ADMIN' ? [...ADMIN_PERMISSIONS] : [...USER_PERMISSIONS];
  const token = jwt.sign({ userId, role, permissions, sessionVersion: 1 }, config.jwtSecret, { expiresIn: '1h' });
  return `frames_auth=${encodeURIComponent(token)}`;
}

export async function resetStore(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes('_test')) {
    throw new Error(`STOP: Attempted to run tests against a non-test database! URL: ${process.env.DATABASE_URL}`);
  }

  await prisma.$executeRawUnsafe('TRUNCATE TABLE "_PermissionToRole", "PasswordResetToken", "RecoveryCode", "AuditLog", "SuspiciousUser", "ListMovie", "Frame", "CustomList", "Movie", "User", "Role", "Permission" RESTART IDENTITY CASCADE');

  for (const name of ADMIN_PERMISSIONS) {
    await prisma.permission.create({ data: { name } });
  }

  await prisma.role.create({
    data: {
      id: TEST_ROLE_ID,
      name: 'USER',
      permissions: {
        connect: USER_PERMISSIONS.map((name) => ({ name })),
      },
    },
  });

  await prisma.role.create({
    data: {
      id: TEST_ADMIN_ROLE_ID,
      name: 'ADMIN',
      permissions: {
        connect: ADMIN_PERMISSIONS.map((name) => ({ name })),
      },
    },
  });

  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: 'testuser@example.com',
      name: 'Integration Test User',
      passwordHash: await bcrypt.hash('password123', 12),
      roleId: TEST_ROLE_ID,
    },
  });

  await prisma.user.create({
    data: {
      id: TEST_ADMIN_ID,
      email: 'admin@example.com',
      name: 'Integration Test Admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      roleId: TEST_ADMIN_ROLE_ID,
    },
  });
}

export async function createTestUser(input: {
  id: string;
  email: string;
  name?: string;
  roleId?: string;
}) {
  return prisma.user.create({
    data: {
      id: input.id,
      email: input.email,
      name: input.name ?? input.email,
      passwordHash: await bcrypt.hash('password123', 12),
      roleId: input.roleId ?? TEST_ROLE_ID,
    },
  });
}

export async function createMovie(overrides?: Record<string, unknown>, userId = TEST_USER_ID, role: 'USER' | 'ADMIN' = 'USER') {
  const payload = {
    movieName: 'Inception',
    watchDate: '2025-01-10',
    rating: 4.5,
    review: 'Great movie',
    ...overrides,
  };

  return request(app).post('/api/movies').set(authHeader(userId, role)).send(payload);
}

export async function createList(overrides?: Record<string, unknown>, userId = TEST_USER_ID, role: 'USER' | 'ADMIN' = 'USER') {
  const payload = {
    name: 'Favorites',
    description: 'My favorite movies',
    ...overrides,
  };

  return request(app).post('/api/lists').set(authHeader(userId, role)).send(payload);
}

export async function addMovieToList(listId: string, movieId: string, userId = TEST_USER_ID, role: 'USER' | 'ADMIN' = 'USER') {
  return request(app)
    .post(`/api/lists/${listId}/movies/${movieId}`)
    .set(authHeader(userId, role))
    .send();
}
