import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/repositories/prismaClient.js';

export const app = createApp();

export const TEST_USER_ID = 'test-user-123';

export async function resetStore(): Promise<void> {
  if (!process.env.DATABASE_URL?.includes('frames_test')) {
    throw new Error(`STOP: Attempted to run tests against a non-test database! URL: ${process.env.DATABASE_URL}`);
  }

  // Acquire a Postgres advisory lock so concurrent test workers don't
  // deadlock when truncating tables.
  await prisma.$executeRawUnsafe('SELECT pg_advisory_lock(123456789)');
  try {
    // Use a single TRUNCATE with CASCADE to reliably clear all tables.
    // This avoids potential foreign-key ordering issues and is faster.
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ListMovie", "Frame", "CustomList", "Movie", "User" CASCADE');

    // Seed the dummy user so that Foreign Key constraints pass for lists and movies!
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: 'testuser@example.com',
        name: 'Integration Test User',
        passwordHash: 'dummy-hash',
      }
    });

  } finally {
    await prisma.$executeRawUnsafe('SELECT pg_advisory_unlock(123456789)');
  }
}

export async function createMovie(overrides?: Record<string, unknown>) {
  const payload = {
    movieName: 'Inception',
    watchDate: '2025-01-10',
    rating: 4.5,
    review: 'Great movie',
    ...overrides,
  };

  return request(app).post('/api/movies').set('X-User-Id', TEST_USER_ID).send(payload);
}

export async function createList(overrides?: Record<string, unknown>) {
  const payload = {
    name: 'Favorites',
    description: 'My favorite movies',
    ...overrides,
  };

  return request(app).post('/api/lists').set('X-User-Id', TEST_USER_ID).send(payload);
}