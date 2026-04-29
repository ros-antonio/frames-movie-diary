import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createList, createMovie, resetStore } from './testUtils.js';

describe('movies API', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('creates and fetches a movie', async () => {
    const created = await createMovie();

    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf('string');
    expect(created.body.frames).toEqual([]);

    const fetched = await request(app).get(`/api/movies/${created.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.movieName).toBe('Inception');
  });

  it('rejects invalid movie payload', async () => {
    const response = await request(app).post('/api/movies').send({
      movieName: '',
      watchDate: '2999-12-31',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects watchDate with invalid format and invalid calendar date', async () => {
    const invalidFormat = await request(app).post('/api/movies').send({
      movieName: 'Bad Date Format',
      watchDate: '2025/01/10',
    });

    expect(invalidFormat.status).toBe(400);
    expect(invalidFormat.body.message).toBe('Validation failed');

    const invalidDate = await request(app).post('/api/movies').send({
      movieName: 'Bad Date Value',
      watchDate: '2025-13-40',
    });

    expect(invalidDate.status).toBe(400);
    expect(invalidDate.body.message).toBe('Validation failed');
  });

  it('supports pagination from server side', async () => {
    await createMovie({ movieName: 'Movie 1', watchDate: '2025-01-01' });
    await createMovie({ movieName: 'Movie 2', watchDate: '2025-01-02' });
    await createMovie({ movieName: 'Movie 3', watchDate: '2025-01-03' });

    const page1 = await request(app).get('/api/movies?page=1&pageSize=2');
    const page2 = await request(app).get('/api/movies?page=2&pageSize=2');

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination.totalItems).toBe(3);
    expect(page1.body.pagination.totalPages).toBe(2);

    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(1);
  });

  it('updates and deletes a movie', async () => {
    const created = await createMovie();

    const updated = await request(app).put(`/api/movies/${created.body.id}`).send({
      movieName: 'Interstellar',
      watchDate: '2025-01-11',
      rating: 5,
      review: 'Masterpiece',
      movieLink: 'https://example.com/interstellar',
    });

    expect(updated.status).toBe(200);
    expect(updated.body.movieName).toBe('Interstellar');

    const deleted = await request(app).delete(`/api/movies/${created.body.id}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/movies/${created.body.id}`);
    expect(missing.status).toBe(404);
  });

  it('removes deleted movie ids from related lists', async () => {
    const movie = await createMovie();
    const list = await createList();

    const added = await request(app).post(`/api/lists/${list.body.id}/movies/${movie.body.id}`);
    expect(added.status).toBe(200);
    expect(added.body.movieIds).toEqual([movie.body.id]);

    const deleted = await request(app).delete(`/api/movies/${movie.body.id}`);
    expect(deleted.status).toBe(204);

    const fetchedList = await request(app).get(`/api/lists/${list.body.id}`);
    expect(fetchedList.status).toBe(200);
    expect(fetchedList.body.movieIds).toEqual([]);
  });

  it('adds and removes a frame', async () => {
    const created = await createMovie();

    const frame = await request(app)
      .post(`/api/movies/${created.body.id}/frames`)
      .send({
        imageUrl: 'data:image/png;base64,abc123',
        timestamp: '01:23:45',
        caption: 'Great scene',
      });

    expect(frame.status).toBe(201);
    expect(frame.body.id).toBeTypeOf('string');

    const deleted = await request(app).delete(`/api/movies/${created.body.id}/frames/${frame.body.id}`);
    expect(deleted.status).toBe(204);
  });

  it('accepts large PNG data URLs for frame uploads', async () => {
    const created = await createMovie();
    const largeDataUrl = `data:image/png;base64,${'A'.repeat(5_000)}`;

    const frame = await request(app)
      .post(`/api/movies/${created.body.id}/frames`)
      .send({
        imageUrl: largeDataUrl,
        timestamp: '01:23:45',
        caption: 'Large upload',
      });

    expect(frame.status).toBe(201);
    expect(frame.body.imageUrl).toBe(largeDataUrl);
  });

  it('rejects invalid frame payload', async () => {
    const created = await createMovie();

    const response = await request(app)
      .post(`/api/movies/${created.body.id}/frames`)
      .send({
        imageUrl: '',
        timestamp: 'invalid-time',
        caption: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('returns 404 when deleting a missing frame', async () => {
    const created = await createMovie();
    const missingFrameId = '00000000-0000-4000-8000-000000000001';

    const response = await request(app).delete(`/api/movies/${created.body.id}/frames/${missingFrameId}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Frame not found');
  });
});

