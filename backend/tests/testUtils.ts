import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/repositories/prismaClient.js';

export const app = createApp();

export async function resetStore(): Promise<void> {
  // Acquire a Postgres advisory lock so concurrent test workers don't
  // deadlock when truncating tables. Use try/finally to ensure the lock
  // is released.
  await prisma.$executeRawUnsafe('SELECT pg_advisory_lock(123456789)');
  try {
    // Use a single TRUNCATE with CASCADE to reliably clear all tables.
    // This avoids potential foreign-key ordering issues and is faster.
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "ListMovie", "Frame", "CustomList", "Movie", "User" CASCADE');
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

  return request(app).post('/api/movies').send(payload);
}

export async function createList(overrides?: Record<string, unknown>) {
  const payload = {
    name: 'Favorites',
    description: 'My favorite movies',
    ...overrides,
  };

  return request(app).post('/api/lists').send(payload);
}
