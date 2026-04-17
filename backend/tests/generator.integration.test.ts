import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app, resetStore } from './testUtils.js';
import { fakeDataGeneratorService } from '../src/services/fakeDataGeneratorService.js';

describe('generator API', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    fakeDataGeneratorService.stop();
  });

  it('starts and stops fake data generation loop', async () => {
    const started = await request(app).post('/api/generator/start').send({
      batchSize: 2,
      intervalMs: 100,
    });

    expect(started.status).toBe(200);
    expect(started.body.started).toBe(true);
    expect(started.body.status.running).toBe(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 350);
    });

    const movies = await request(app).get('/api/movies?page=1&pageSize=100');
    expect(movies.status).toBe(200);
    expect(movies.body.pagination.totalItems).toBeGreaterThanOrEqual(2);

    const stopped = await request(app).post('/api/generator/stop');
    expect(stopped.status).toBe(200);
    expect(stopped.body.stopped).toBe(true);
    expect(stopped.body.status.running).toBe(false);
  });

  it('returns conflict when start is called while loop is already running', async () => {
    const first = await request(app).post('/api/generator/start').send({
      batchSize: 1,
      intervalMs: 1_000,
    });
    expect(first.status).toBe(200);

    const second = await request(app).post('/api/generator/start').send({
      batchSize: 1,
      intervalMs: 1_000,
    });

    expect(second.status).toBe(409);
    expect(second.body.started).toBe(false);
  });
});

