import request from 'supertest';
import { createApp } from '../src/app.js';
import { store } from '../src/repositories/inMemoryStore.js';

export const app = createApp();

export function resetStore(): void {
  store.reset();
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

