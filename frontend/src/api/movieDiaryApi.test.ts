import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiHttpError,
  ApiNetworkError,
  isOfflineLikeError,
  movieDiaryApi,
} from './movieDiaryApi';

type MockResponseShape = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function mockFetchResponse(response: MockResponseShape) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response as unknown as Response));
}

function parseGraphQLBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  const call = fetchMock.mock.calls[callIndex];
  return JSON.parse(String(call[1]?.body)) as { query: string; variables?: Record<string, unknown> };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('movieDiaryApi error handling', () => {
  it('classifies offline-like errors correctly', () => {
    expect(isOfflineLikeError(new ApiNetworkError('offline'))).toBe(true);
    expect(isOfflineLikeError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isOfflineLikeError(new Error('Network unreachable'))).toBe(true);
    expect(isOfflineLikeError(new Error('Validation failed'))).toBe(false);
    expect(isOfflineLikeError('random')).toBe(false);
  });

  it('wraps fetch rejections as ApiNetworkError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(movieDiaryApi.getStatisticsOverview()).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it('uses default ApiNetworkError message when fetch rejects with a non-Error value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('network-down'));

    await expect(movieDiaryApi.getStatisticsOverview()).rejects.toMatchObject({
      name: 'ApiNetworkError',
      message: 'Network is unavailable',
    });
  });

  it('throws ApiHttpError with backend JSON message', async () => {
    mockFetchResponse({
      ok: false,
      status: 400,
      json: async () => ({ errors: [{ message: 'Bad payload from API' }] }),
    });

    await expect(movieDiaryApi.createMovie({ movieName: 'A', watchDate: '2026-01-01' })).rejects.toMatchObject({
      name: 'ApiHttpError',
      status: 400,
      message: 'Bad payload from API',
    });
  });

  it('falls back to generic message when error body is not JSON', async () => {
    mockFetchResponse({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('not-json');
      },
    });

    await expect(movieDiaryApi.getAllMovies()).rejects.toMatchObject({
      name: 'ApiHttpError',
      status: 503,
      message: 'Request failed (503)',
    });
  });

  it('maps graphql errors from successful http responses to ApiHttpError', async () => {
    mockFetchResponse({
      ok: true,
      status: 200,
      json: async () => ({
        errors: [
          {
            message: 'Validation failed',
            extensions: {
              statusCode: 400,
              details: [{ message: 'movieName is required' }],
            },
          },
        ],
      }),
    });

    await expect(movieDiaryApi.createMovie({ movieName: '', watchDate: '2026-01-01' })).rejects.toMatchObject({
      name: 'ApiHttpError',
      status: 400,
      message: 'Validation failed: movieName is required',
    });
  });

  it('aggregates paginated movie responses until no next page exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            movies: {
              data: [{ id: 'movie-1', movieName: 'Movie 1', watchDate: '2026-01-01', frames: [] }],
              pagination: {
                page: 1,
                pageSize: 100,
                totalItems: 2,
                totalPages: 2,
                hasNextPage: true,
                hasPreviousPage: false,
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            movies: {
              data: [{ id: 'movie-2', movieName: 'Movie 2', watchDate: '2026-01-02', frames: [] }],
              pagination: {
                page: 2,
                pageSize: 100,
                totalItems: 2,
                totalPages: 2,
                hasNextPage: false,
                hasPreviousPage: true,
              },
            },
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const movies = await movieDiaryApi.getAllMovies();

    expect(movies).toHaveLength(2);
    expect(movies.map((movie) => movie.id)).toEqual(['movie-1', 'movie-2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/graphql');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/graphql');
    const firstBody = parseGraphQLBody(fetchMock, 0);
    const secondBody = parseGraphQLBody(fetchMock, 1);
    expect(firstBody.variables).toMatchObject({ page: 1, pageSize: 100 });
    expect(secondBody.variables).toMatchObject({ page: 2, pageSize: 100 });
  });

  it('creates ApiHttpError instances with status', () => {
    const error = new ApiHttpError(409, 'Conflict');
    expect(error.status).toBe(409);
    expect(error.message).toBe('Conflict');
  });

  it('calls all API wrapper methods as graphql POST requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { createList: { id: 'list1', name: 'L1', description: 'D1', movieIds: [] } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { deleteList: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { addMovieToList: { id: 'list1', name: 'L1', description: 'D1', movieIds: ['movie1'] } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { removeMovieFromList: { id: 'list1', name: 'L1', description: 'D1', movieIds: [] } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            addFrame: { id: 'frame1', imageUrl: 'data:image/png;base64,AA', timestamp: '00:10', caption: 'Cap' },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { deleteFrame: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { register: { id: 'u1', name: 'Tony', email: 'tony@example.com' } } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { login: { id: 'u1', name: 'Tony', email: 'tony@example.com' } } }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await movieDiaryApi.createList('L1', 'D1');
    await movieDiaryApi.deleteList('list1');
    await movieDiaryApi.addMovieToList('list1', 'movie1');
    await movieDiaryApi.removeMovieFromList('list1', 'movie1');
    await movieDiaryApi.addFrame('movie1', { imageUrl: 'data:image/png;base64,AA', timestamp: '00:10', caption: 'Cap' });
    await movieDiaryApi.deleteFrame('movie1', 'frame1');
    await movieDiaryApi.register({
      name: 'Tony',
      email: 'tony@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    await movieDiaryApi.login({ email: 'tony@example.com', password: 'password123' });

    expect(fetchMock).toHaveBeenCalledTimes(8);
    for (let index = 0; index < 8; index += 1) {
      expect(fetchMock.mock.calls[index][1]?.method).toBe('POST');
      expect(String(fetchMock.mock.calls[index][0])).toContain('/api/graphql');
    }

    expect(parseGraphQLBody(fetchMock, 0).query).toContain('mutation CreateList');
    expect(parseGraphQLBody(fetchMock, 1).query).toContain('mutation DeleteList');
    expect(parseGraphQLBody(fetchMock, 2).query).toContain('mutation AddMovieToList');
    expect(parseGraphQLBody(fetchMock, 3).query).toContain('mutation RemoveMovieFromList');
    expect(parseGraphQLBody(fetchMock, 4).query).toContain('mutation AddFrame');
    expect(parseGraphQLBody(fetchMock, 5).query).toContain('mutation DeleteFrame');
    expect(parseGraphQLBody(fetchMock, 6).query).toContain('mutation Register');
    expect(parseGraphQLBody(fetchMock, 7).query).toContain('mutation Login');
  });

  it('calls updateMovie as graphql mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          updateMovie: { id: 'movie-1', movieName: 'Updated', watchDate: '2026-02-01', frames: [] },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await movieDiaryApi.updateMovie('movie-1', { movieName: 'Updated', watchDate: '2026-02-01' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/graphql');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(parseGraphQLBody(fetchMock, 0).query).toContain('mutation UpdateMovie');
    expect(parseGraphQLBody(fetchMock, 0).variables).toMatchObject({ movieId: 'movie-1' });
  });

  it('fetches all lists through paginated graphql query', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          lists: {
            data: [{ id: 'list-1', name: 'Favorites', description: 'desc', movieIds: [] }],
            pagination: {
              page: 1,
              pageSize: 100,
              totalItems: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const lists = await movieDiaryApi.getAllLists();

    expect(lists).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/graphql');
    expect(parseGraphQLBody(fetchMock, 0).variables).toMatchObject({ page: 1, pageSize: 100 });
  });

  it('maps statistics rating distribution back to string rating keys', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          statisticsOverview: {
            totalMovies: 1,
            ratedMovies: 1,
            unratedMovies: 0,
            averageRating: 4,
            totalFrames: 0,
            moviesWithFrames: 0,
            topRatedMovies: [{ id: 'm1', movieName: 'Movie 1', rating: 4 }],
            ratingDistribution: {
              value0_5: 0,
              value1: 0,
              value1_5: 0,
              value2: 0,
              value2_5: 0,
              value3: 0,
              value3_5: 0,
              value4: 1,
              value4_5: 0,
              value5: 0,
            },
          },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const statistics = await movieDiaryApi.getStatisticsOverview();

    expect(statistics.ratingDistribution['4']).toBe(1);
    expect(statistics.ratingDistribution['4.5']).toBe(0);
  });
});

