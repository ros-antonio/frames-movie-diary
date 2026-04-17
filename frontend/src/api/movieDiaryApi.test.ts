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
      json: async () => ({ message: 'Bad payload from API' }),
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

  it('supports 204 responses for delete endpoints', async () => {
    mockFetchResponse({
      ok: true,
      status: 204,
      json: async () => ({}),
    });

    await expect(movieDiaryApi.deleteMovie('movie-id')).resolves.toBeUndefined();
  });

  it('aggregates paginated movie responses until no next page exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'movie-1', movieName: 'Movie 1', watchDate: '2026-01-01', frames: [] }],
          pagination: {
            page: 1,
            pageSize: 100,
            totalItems: 2,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'movie-2', movieName: 'Movie 2', watchDate: '2026-01-02', frames: [] }],
          pagination: {
            page: 2,
            pageSize: 100,
            totalItems: 2,
            totalPages: 2,
            hasNextPage: false,
            hasPreviousPage: true,
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const movies = await movieDiaryApi.getAllMovies();

    expect(movies).toHaveLength(2);
    expect(movies.map((movie) => movie.id)).toEqual(['movie-1', 'movie-2']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/movies?page=1&pageSize=100');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/movies?page=2&pageSize=100');
  });

  it('creates ApiHttpError instances with status', () => {
    const error = new ApiHttpError(409, 'Conflict');
    expect(error.status).toBe(409);
    expect(error.message).toBe('Conflict');
  });

  it('calls all API wrapper methods with expected routes and methods', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'list1', name: 'L1', description: 'D1', movieIds: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'list1', name: 'L1', description: 'D1', movieIds: ['movie1'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'list1', name: 'L1', description: 'D1', movieIds: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'frame1', imageUrl: 'data:image/png;base64,AA', timestamp: '00:10', caption: 'Cap' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'u1', name: 'Tony', email: 'tony@example.com' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'u1', name: 'Tony', email: 'tony@example.com' }),
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
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/lists');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('DELETE');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/lists/list1');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/lists/list1/movies/movie1');
    expect(fetchMock.mock.calls[2][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[3][1]?.method).toBe('DELETE');
    expect(String(fetchMock.mock.calls[4][0])).toContain('/movies/movie1/frames');
    expect(fetchMock.mock.calls[4][1]?.method).toBe('POST');
    expect(fetchMock.mock.calls[5][1]?.method).toBe('DELETE');
    expect(String(fetchMock.mock.calls[6][0])).toContain('/auth/register');
    expect(String(fetchMock.mock.calls[7][0])).toContain('/auth/login');
  });

  it('calls updateMovie with PUT and movie id in route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'movie-1', movieName: 'Updated', watchDate: '2026-02-01', frames: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await movieDiaryApi.updateMovie('movie-1', { movieName: 'Updated', watchDate: '2026-02-01' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/movies/movie-1');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT');
  });

  it('fetches all lists through paginated endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 'list-1', name: 'Favorites', description: 'desc', movieIds: [] }],
        pagination: {
          page: 1,
          pageSize: 100,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const lists = await movieDiaryApi.getAllLists();

    expect(lists).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/lists?page=1&pageSize=100');
  });

  it('calls generator status, start, and stop endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ running: false, batchSize: 3, intervalMs: 3000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ started: true, status: { running: true, batchSize: 3, intervalMs: 3000 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ stopped: true, status: { running: false, batchSize: 3, intervalMs: 3000 } }),
      });

    vi.stubGlobal('fetch', fetchMock);

    await movieDiaryApi.getGeneratorStatus();
    await movieDiaryApi.startGenerator();
    await movieDiaryApi.stopGenerator();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/generator/status');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/generator/start');
    expect(fetchMock.mock.calls[2][1]?.method).toBe('POST');
    expect(String(fetchMock.mock.calls[2][0])).toContain('/generator/stop');
  });
});

