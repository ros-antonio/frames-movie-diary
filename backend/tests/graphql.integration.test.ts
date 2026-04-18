import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, resetStore } from './testUtils.js';

describe('graphql API', () => {
  beforeEach(() => {
    resetStore();
  });

  it('creates and queries movies through graphql', async () => {
    const createResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation CreateMovie($input: MovieInput!) {
            createMovie(input: $input) {
              id
              movieName
              watchDate
              frames { id }
            }
          }
        `,
        variables: {
          input: {
            movieName: 'Dune',
            watchDate: '2025-03-24',
            rating: 4.5,
          },
        },
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.errors).toBeUndefined();
    expect(createResponse.body.data.createMovie.movieName).toBe('Dune');

    const listResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          query ListMovies($page: Int!, $pageSize: Int!) {
            movies(page: $page, pageSize: $pageSize) {
              data {
                id
                movieName
              }
              pagination {
                totalItems
                totalPages
                hasNextPage
              }
            }
          }
        `,
        variables: {
          page: 1,
          pageSize: 10,
        },
      });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.errors).toBeUndefined();
    expect(listResponse.body.data.movies.data).toHaveLength(1);
    expect(listResponse.body.data.movies.pagination.totalItems).toBe(1);
  });

  it('returns validation details for invalid graphql input', async () => {
    const response = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation InvalidMovie($input: MovieInput!) {
            createMovie(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            movieName: '',
            watchDate: '2999-12-31',
          },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
    expect(response.body.errors).toHaveLength(1);
    expect(response.body.errors[0].message).toBe('Validation failed');
    expect(response.body.errors[0].extensions.statusCode).toBe(400);
    expect(Array.isArray(response.body.errors[0].extensions.details)).toBe(true);
  });

  it('exposes statistics overview through graphql', async () => {
    const createMovieResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation CreateMovie($input: MovieInput!) {
            createMovie(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            movieName: 'A',
            watchDate: '2025-01-01',
            rating: 5,
          },
        },
      });

    const movieId = createMovieResponse.body.data.createMovie.id as string;

    await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation AddFrame($movieId: ID!, $input: FrameInput!) {
            addFrame(movieId: $movieId, input: $input) {
              id
            }
          }
        `,
        variables: {
          movieId,
          input: {
            imageUrl: 'data:image/png;base64,abc123',
            timestamp: '00:30',
            caption: 'Scene',
          },
        },
      });

    const response = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          query {
            statisticsOverview {
              totalMovies
              totalFrames
              ratedMovies
              ratingDistribution {
                value5
              }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.statisticsOverview.totalMovies).toBe(1);
    expect(response.body.data.statisticsOverview.totalFrames).toBe(1);
    expect(response.body.data.statisticsOverview.ratedMovies).toBe(1);
    expect(response.body.data.statisticsOverview.ratingDistribution.value5).toBe(1);
  });

  it('supports list membership mutations through graphql', async () => {
    const createMovieResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation CreateMovie($input: MovieInput!) {
            createMovie(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            movieName: 'Arrival',
            watchDate: '2025-01-10',
          },
        },
      });

    const movieId = createMovieResponse.body.data.createMovie.id as string;

    const createListResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation CreateList($input: ListInput!) {
            createList(input: $input) {
              id
              name
              movieIds
            }
          }
        `,
        variables: {
          input: {
            name: 'Sci-Fi',
            description: 'Favorites',
          },
        },
      });

    expect(createListResponse.status).toBe(200);
    expect(createListResponse.body.errors).toBeUndefined();

    const listId = createListResponse.body.data.createList.id as string;

    const addMovieResponse = await request(app)
      .post('/api/graphql')
      .send({
        query: `
          mutation AddMovieToList($listId: ID!, $movieId: ID!) {
            addMovieToList(listId: $listId, movieId: $movieId) {
              id
              movieIds
            }
          }
        `,
        variables: {
          listId,
          movieId,
        },
      });

    expect(addMovieResponse.status).toBe(200);
    expect(addMovieResponse.body.errors).toBeUndefined();
    expect(addMovieResponse.body.data.addMovieToList.movieIds).toEqual([movieId]);
  });
});

