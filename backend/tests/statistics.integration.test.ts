import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createMovie, resetStore } from './testUtils.js';

describe('statistics API', () => {
  beforeEach(() => {
    resetStore();
  });

  it('returns health check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('computes overview statistics', async () => {
    const movieA = await createMovie({ movieName: 'A', rating: 4, watchDate: '2025-01-01' });
    const movieB = await createMovie({ movieName: 'B', rating: 5, watchDate: '2025-01-02' });
    await createMovie({ movieName: 'C', watchDate: '2025-01-03', review: 'Unrated', rating: undefined });

    await request(app).post(`/api/movies/${movieA.body.id}/frames`).send({
      imageUrl: 'data:image/png;base64,one',
      timestamp: '00:10',
      caption: 'First',
    });

    await request(app).post(`/api/movies/${movieB.body.id}/frames`).send({
      imageUrl: 'data:image/png;base64,two',
      timestamp: '01:10',
      caption: 'Second',
    });

    const response = await request(app).get('/api/statistics/overview');

    expect(response.status).toBe(200);
    expect(response.body.totalMovies).toBe(3);
    expect(response.body.ratedMovies).toBe(2);
    expect(response.body.unratedMovies).toBe(1);
    expect(response.body.averageRating).toBe(4.5);
    expect(response.body.totalFrames).toBe(2);
    expect(response.body.moviesWithFrames).toBe(2);
    expect(response.body.topRatedMovies[0].rating).toBe(5);
  });
});

