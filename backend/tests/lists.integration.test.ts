import request from 'supertest';
import {beforeEach, describe, expect, it} from 'vitest';
import {app, createList, createMovie, resetStore, authHeader} from './testUtils.js';

describe('lists API', () => {
  beforeEach(async () => {
    await resetStore();
  });

  it('creates and fetches a custom list', async () => {
    const created = await createList();

    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf('string');
    expect(created.body.movieIds).toEqual([]);

    const fetched = await request(app)
      .get(`/api/lists/${created.body.id}`)
      .set(authHeader());
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Favorites');
  });

  it('rejects invalid list payload', async () => {
    const response = await request(app)
      .post('/api/lists')
      .set(authHeader())
      .send({
        name: '',
        description: 'x',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  it('supports server-side pagination', async () => {
    await createList({name: 'List 1'});
    await createList({name: 'List 2'});
    await createList({name: 'List 3'});

    const page1 = await request(app)
      .get('/api/lists?page=1&pageSize=2')
      .set(authHeader());
    const page2 = await request(app)
      .get('/api/lists?page=2&pageSize=2')
      .set(authHeader());

    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination.totalItems).toBe(3);
    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(1);
  });

  it('adds and removes movie membership', async () => {
    const movie = await createMovie();
    const list = await createList();

    const added = await request(app)
      .post(`/api/lists/${list.body.id}/movies/${movie.body.id}`)
      .set(authHeader());
    expect(added.status).toBe(200);
    expect(added.body.movieIds).toEqual([movie.body.id]);

    const removed = await request(app)
      .delete(`/api/lists/${list.body.id}/movies/${movie.body.id}`)
      .set(authHeader());
    expect(removed.status).toBe(200);
    expect(removed.body.movieIds).toEqual([]);
  });

  it('returns 409 when adding the same movie twice to a list', async () => {
    const movie = await createMovie();
    const list = await createList();

    const firstAdd = await request(app)
      .post(`/api/lists/${list.body.id}/movies/${movie.body.id}`)
      .set(authHeader());
    expect(firstAdd.status).toBe(200);

    const secondAdd = await request(app)
      .post(`/api/lists/${list.body.id}/movies/${movie.body.id}`)
      .set(authHeader());
    expect(secondAdd.status).toBe(409);
    expect(secondAdd.body.message).toBe('Movie already in list');
  });

  it('returns 404 when adding a missing movie to a list', async () => {
    const list = await createList();
    const missingMovieId = '00000000-0000-4000-8000-000000000001';

    const response = await request(app)
      .post(`/api/lists/${list.body.id}/movies/${missingMovieId}`)
      .set(authHeader());

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Movie not found');
  });

  it('returns 404 when removing a movie that is not in the list', async () => {
    const movie = await createMovie();
    const list = await createList();

    const response = await request(app)
      .delete(`/api/lists/${list.body.id}/movies/${movie.body.id}`)
      .set(authHeader());

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Movie not in list');
  });

  it('updates and deletes a list', async () => {
    const list = await createList();

    const updated = await request(app)
      .put(`/api/lists/${list.body.id}`)
      .set(authHeader())
      .send({
        name: 'Watch Later',
        description: 'Queued',
      });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Watch Later');

    const deleted = await request(app)
      .delete(`/api/lists/${list.body.id}`)
      .set(authHeader());
    expect(deleted.status).toBe(204);

    const missing = await request(app)
      .get(`/api/lists/${list.body.id}`)
      .set(authHeader());
    expect(missing.status).toBe(404);
  });

  it('returns 404 when fetching a missing list', async () => {
    const response = await request(app)
      .get('/api/lists/00000000-0000-4000-8000-000000000001')
      .set(authHeader());

    expect(response.status).toBe(404);
  });

  it('returns 404 when updating a missing list', async () => {
    const response = await request(app)
      .put('/api/lists/00000000-0000-4000-8000-000000000001')
      .set(authHeader())
      .send({
        name: 'Missing',
        description: 'Does not exist',
      });

    expect(response.status).toBe(404);
  });

  it('returns 404 when deleting a missing list', async () => {
    const response = await request(app)
      .delete('/api/lists/00000000-0000-4000-8000-000000000001')
      .set(authHeader());

    expect(response.status).toBe(404);
  });

  it('returns 400 when creating a list with a non-existent user ID (P2003)', async () => {
    const response = await request(app)
      .post('/api/lists')
      .set(authHeader('ghost-user-id-123'))
      .send({
        name: 'Ghost List',
        description: 'Spooky',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid user ID');
  });
});