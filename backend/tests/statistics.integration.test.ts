import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { TEST_ADMIN_ID, TEST_OTHER_USER_ID, addMovieToList, app, authHeader, createList, createMovie, createTestUser, resetStore } from './testUtils.js';

describe('statistics API', () => {
  beforeEach(async () => {
    await resetStore();
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

    await request(app)
      .post(`/api/movies/${movieA.body.id}/frames`)
      .set(authHeader())
      .send({
        imageUrl: 'data:image/png;base64,one',
        timestamp: '00:10',
        caption: 'First',
      });

    await request(app)
      .post(`/api/movies/${movieB.body.id}/frames`)
      .set(authHeader())
      .send({
        imageUrl: 'data:image/png;base64,two',
        timestamp: '01:10',
        caption: 'Second',
      });

    const response = await request(app)
      .get('/api/statistics/overview')
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.totalMovies).toBe(3);
    expect(response.body.ratedMovies).toBe(2);
    expect(response.body.unratedMovies).toBe(1);
    expect(response.body.averageRating).toBe(4.5);
    expect(response.body.totalFrames).toBe(2);
    expect(response.body.moviesWithFrames).toBe(2);
  });

  it('returns null average when no movies are rated', async () => {
    await createMovie({ movieName: 'Unrated A', rating: undefined, watchDate: '2025-02-01' });
    await createMovie({ movieName: 'Unrated B', rating: undefined, watchDate: '2025-02-02' });

    const response = await request(app)
      .get('/api/statistics/overview')
      .set(authHeader());

    expect(response.status).toBe(200);
    expect(response.body.totalMovies).toBe(2);
    expect(response.body.ratedMovies).toBe(0);
    expect(response.body.averageRating).toBeNull();
    expect(response.body.ratingDistribution['5']).toBe(0);
  });

  it('returns the top same-user list overlaps for admins only', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'second@example.com',
      name: 'Second User',
    });

    const movieOne = await createMovie({ movieName: 'Movie One', watchDate: '2025-01-01' });
    const movieTwo = await createMovie({ movieName: 'Movie Two', watchDate: '2025-01-02' });
    const movieThree = await createMovie({ movieName: 'Movie Three', watchDate: '2025-01-03' });
    const userListA = await createList({ name: 'Weekend Watch' });
    const userListB = await createList({ name: 'Rewatch Queue' });
    const userListC = await createList({ name: 'Favorites Only' });

    await addMovieToList(userListA.body.id, movieOne.body.id);
    await addMovieToList(userListA.body.id, movieTwo.body.id);
    await addMovieToList(userListB.body.id, movieTwo.body.id);
    await addMovieToList(userListB.body.id, movieThree.body.id);
    await addMovieToList(userListC.body.id, movieOne.body.id);

    const otherMovie = await createMovie({ movieName: 'Movie One', watchDate: '2025-02-01' }, TEST_OTHER_USER_ID);
    const otherList = await createList({ name: 'Weekend Watch' }, TEST_OTHER_USER_ID);
    const otherListTwo = await createList({ name: 'Top Picks' }, TEST_OTHER_USER_ID);
    await addMovieToList(otherList.body.id, otherMovie.body.id, TEST_OTHER_USER_ID);
    await addMovieToList(otherListTwo.body.id, otherMovie.body.id, TEST_OTHER_USER_ID);

    const forbidden = await request(app)
      .get('/api/statistics/list-overlaps')
      .set(authHeader());

    expect(forbidden.status).toBe(403);

    const response = await request(app)
      .get('/api/statistics/list-overlaps')
      .set(authHeader(TEST_ADMIN_ID, 'ADMIN'));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        userEmail: 'second@example.com',
        listAName: 'Top Picks',
        listBName: 'Weekend Watch',
        listAMovieCount: 1,
        listBMovieCount: 1,
        sharedMovieCount: 1,
        similarityScore: 1,
      }),
    ]));
    expect(response.body).toContainEqual(expect.objectContaining({
      userEmail: 'testuser@example.com',
      sharedMovieCount: 1,
      similarityScore: 0.5,
    }));
    expect(
      response.body.some((entry: {
        listAName: string;
        listBName: string;
        similarityScore: number;
      }) =>
        entry.similarityScore === 0.5
        && [entry.listAName, entry.listBName].includes('Favorites Only')
        && [entry.listAName, entry.listBName].includes('Weekend Watch'),
      ),
    ).toBe(true);
    expect(
      response.body.some((entry: {
        listAName: string;
        listBName: string;
        listAMovieCount: number;
        listBMovieCount: number;
        similarityScore: number;
      }) =>
        entry.similarityScore === 0.3333
        && entry.listAMovieCount === 2
        && entry.listBMovieCount === 2
        && [entry.listAName, entry.listBName].includes('Rewatch Queue')
        && [entry.listAName, entry.listBName].includes('Weekend Watch'),
      ),
    ).toBe(true);
  });

  it('returns the same overlap leaderboard from the naive admin endpoint', async () => {
    await createTestUser({
      id: TEST_OTHER_USER_ID,
      email: 'second@example.com',
      name: 'Second User',
    });

    const movieOne = await createMovie({ movieName: 'Movie One', watchDate: '2025-01-01' });
    const movieTwo = await createMovie({ movieName: 'Movie Two', watchDate: '2025-01-02' });
    const movieThree = await createMovie({ movieName: 'Movie Three', watchDate: '2025-01-03' });
    const userListA = await createList({ name: 'Weekend Watch' });
    const userListB = await createList({ name: 'Rewatch Queue' });

    await addMovieToList(userListA.body.id, movieOne.body.id);
    await addMovieToList(userListA.body.id, movieTwo.body.id);
    await addMovieToList(userListB.body.id, movieTwo.body.id);
    await addMovieToList(userListB.body.id, movieThree.body.id);

    const otherMovie = await createMovie({ movieName: 'Movie One', watchDate: '2025-02-01' }, TEST_OTHER_USER_ID);
    const otherList = await createList({ name: 'Weekend Watch' }, TEST_OTHER_USER_ID);
    const otherListTwo = await createList({ name: 'Top Picks' }, TEST_OTHER_USER_ID);
    await addMovieToList(otherList.body.id, otherMovie.body.id, TEST_OTHER_USER_ID);
    await addMovieToList(otherListTwo.body.id, otherMovie.body.id, TEST_OTHER_USER_ID);

    const forbidden = await request(app)
      .get('/api/statistics/list-overlaps-naive')
      .set(authHeader());

    expect(forbidden.status).toBe(403);

    const [optimizedResponse, naiveResponse] = await Promise.all([
      request(app)
        .get('/api/statistics/list-overlaps')
        .set(authHeader(TEST_ADMIN_ID, 'ADMIN')),
      request(app)
        .get('/api/statistics/list-overlaps-naive')
        .set(authHeader(TEST_ADMIN_ID, 'ADMIN')),
    ]);

    expect(optimizedResponse.status).toBe(200);
    expect(naiveResponse.status).toBe(200);
    expect(naiveResponse.body).toEqual(optimizedResponse.body);
  });
});

