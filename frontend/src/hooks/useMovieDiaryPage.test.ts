import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiNetworkError } from '../api/movieDiaryApi';
import type { MovieDiaryApi } from '../api/movieDiaryApi';

const mockNavigate = vi.fn();
const mockUseMovieDiary = vi.fn();
const mockTrackPreference = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('./useMovieDiary', () => ({
  useMovieDiary: (...args: unknown[]) => mockUseMovieDiary(...args),
}));

vi.mock('./useUserActivity', () => ({
  useUserActivity: () => ({
    trackPreference: mockTrackPreference,
  }),
}));

import { useMovieDiaryPage } from './useMovieDiaryPage';
import type { MovieLog } from '../types';

function buildMovie(id: string, movieName: string, watchDate: string): MovieLog {
  return { id, movieName, watchDate, frames: [] };
}

type MoviesPagePayload = Awaited<ReturnType<MovieDiaryApi['getMoviesPage']>>;

function buildPage(page: number, data: MovieLog[], hasNextPage: boolean): MoviesPagePayload {
  return {
    data,
    pagination: {
      page,
      pageSize: 12,
      totalItems: data.length,
      totalPages: hasNextPage ? page + 1 : Math.max(page, 1),
      hasNextPage,
      hasPreviousPage: page > 1,
    },
  };
}

function buildDiaryState(movies: MovieLog[], overrides: Record<string, unknown> = {}) {
  return {
    viewMode: 'table',
    setViewMode: vi.fn(),
    currentMovies: movies,
    hasMore: false,
    loadMore: vi.fn(),
    visibleCount: movies.length,
    totalMovies: movies.length,
    requestSort: vi.fn(),
    sortConfig: null,
    ...overrides,
  };
}

describe('useMovieDiaryPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseMovieDiary.mockReset();
    mockTrackPreference.mockReset();
    mockUseMovieDiary.mockImplementation((movies: MovieLog[]) => buildDiaryState(movies));
  });

  it('returns none/asc/desc sort directions based on sortConfig', () => {
    const movieLogs = [buildMovie('1', 'Arrival', '2026-01-01')];

    mockUseMovieDiary.mockReturnValue({
      currentPage: 1,
      setCurrentPage: vi.fn(),
      viewMode: 'table',
      setViewMode: vi.fn(),
      totalPages: 1,
      currentMovies: movieLogs,
      requestSort: vi.fn(),
      sortConfig: { field: 'movieName', order: 'asc' },
    });

    const { result, rerender } = renderHook(() => useMovieDiaryPage(movieLogs));

    expect(result.current.getSortDirection('watchDate')).toBe('none');
    expect(result.current.getSortDirection('movieName')).toBe('asc');

    mockUseMovieDiary.mockReturnValue({
      currentPage: 1,
      setCurrentPage: vi.fn(),
      viewMode: 'table',
      setViewMode: vi.fn(),
      totalPages: 1,
      currentMovies: movieLogs,
      requestSort: vi.fn(),
      sortConfig: { field: 'watchDate', order: 'desc' },
    });

    rerender();

    expect(result.current.getSortDirection('watchDate')).toBe('desc');
  });

  it('navigates to statistics and custom lists pages', () => {
    const movieLogs = [buildMovie('1', 'Arrival', '2026-01-01')];

    mockUseMovieDiary.mockReturnValue({
      currentPage: 1,
      setCurrentPage: vi.fn(),
      viewMode: 'table',
      setViewMode: vi.fn(),
      totalPages: 1,
      currentMovies: movieLogs,
      requestSort: vi.fn(),
      sortConfig: null,
    });

    const { result } = renderHook(() => useMovieDiaryPage(movieLogs));

    act(() => {
      result.current.goToStatistics();
      result.current.goToCustomLists();
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/statistics');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/custom-lists');
  });

  it('tracks view mode preference changes', () => {
    const movieLogs = [buildMovie('1', 'Arrival', '2026-01-01')];
    const setViewMode = vi.fn();

    mockUseMovieDiary.mockReturnValue({
      currentPage: 1,
      setCurrentPage: vi.fn(),
      viewMode: 'table',
      setViewMode,
      totalPages: 1,
      currentMovies: movieLogs,
      requestSort: vi.fn(),
      sortConfig: null,
    });

    const { result } = renderHook(() => useMovieDiaryPage(movieLogs));

    act(() => {
      result.current.handleViewModeChange('card');
    });

    expect(setViewMode).toHaveBeenCalledWith('card');
    expect(mockTrackPreference).toHaveBeenCalledWith({ viewMode: 'card' });
  });

  it('tracks sort preference changes with computed next order', () => {
    const movieLogs = [buildMovie('1', 'Arrival', '2026-01-01')];
    const requestSort = vi.fn();

    mockUseMovieDiary.mockReturnValue({
      currentPage: 1,
      setCurrentPage: vi.fn(),
      viewMode: 'table',
      setViewMode: vi.fn(),
      totalPages: 1,
      currentMovies: movieLogs,
      requestSort,
      sortConfig: { field: 'movieName', order: 'asc' },
    });

    const { result } = renderHook(() => useMovieDiaryPage(movieLogs));

    act(() => {
      result.current.handleSortChange('movieName');
    });

    expect(requestSort).toHaveBeenCalledWith('movieName');
    expect(mockTrackPreference).toHaveBeenCalledWith({ sortBy: 'movieName', sortOrder: 'desc' });
  });

  it('uses local diary paging when server paging is disabled', async () => {
    const localLoadMore = vi.fn();
    mockUseMovieDiary.mockImplementation((movies: MovieLog[]) =>
      buildDiaryState(movies, { hasMore: true, totalMovies: 42, loadMore: localLoadMore }),
    );

    const movieLogs = [buildMovie('1', 'Arrival', '2026-01-01')];
    const { result } = renderHook(() => useMovieDiaryPage(movieLogs));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(localLoadMore).toHaveBeenCalledTimes(1);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.totalMovies).toBe(42);
  });

  it('loads first server page, prefetches next page, and merges unique movies from prefetched payload', async () => {
    const movieA = buildMovie('a', 'Movie A', '2026-01-01');
    const movieB = buildMovie('b', 'Movie B', '2026-01-02');
    const getMoviesPage = vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockImplementation(async (page) => {
      if (page === 1) {
        return buildPage(1, [movieA], true);
      }

      if (page === 2) {
        return buildPage(2, [movieA, movieB], false);
      }

      return buildPage(page, [], false);
    });

    mockUseMovieDiary.mockImplementation((movies: MovieLog[]) => buildDiaryState(movies));

    const { result } = renderHook(() =>
      useMovieDiaryPage([], {
        forceServerPaging: true,
        api: { getMoviesPage },
      }),
    );

    await waitFor(() => {
      expect(getMoviesPage).toHaveBeenCalledWith(1, 12);
      expect(getMoviesPage).toHaveBeenCalledWith(2, 12);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.totalMovies).toBe(2);
    expect(result.current.currentMovies.map((movie) => movie.id)).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(false);
    expect(getMoviesPage).toHaveBeenCalledWith(1, 12);
    expect(getMoviesPage).toHaveBeenCalledWith(2, 12);

    const callCountAfterFirstLoadMore = getMoviesPage.mock.calls.length;

    await act(async () => {
      await result.current.loadMore();
    });

    expect(getMoviesPage.mock.calls.length).toBe(callCountAfterFirstLoadMore);
  });

  it('fetches next page on demand when prefetch is missing and falls back to local mode on offline error', async () => {
    const localMovie1 = buildMovie('local-1', 'Local One', '2026-03-01');
    const localMovie2 = buildMovie('local-2', 'Local Two', '2026-03-02');
    const serverMovie = buildMovie('server-1', 'Server One', '2026-03-03');
    const getMoviesPage = vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockImplementation(async (page) => {
      if (page === 1) {
        return buildPage(1, [serverMovie], true);
      }

      throw new ApiNetworkError('Failed to fetch');
    });

    mockUseMovieDiary.mockImplementation((movies: MovieLog[]) =>
      buildDiaryState(movies, {
        hasMore: movies.length > 1,
      }),
    );

    const { result } = renderHook(() =>
      useMovieDiaryPage([localMovie1, localMovie2], {
        forceServerPaging: true,
        api: { getMoviesPage },
      }),
    );

    await waitFor(() => {
      expect(getMoviesPage).toHaveBeenCalledWith(2, 12);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(getMoviesPage).toHaveBeenCalledWith(2, 12);
    expect(result.current.totalMovies).toBe(2);
    expect(result.current.currentMovies.map((movie) => movie.id)).toEqual(['local-1', 'local-2']);
    expect(result.current.hasMore).toBe(true);
  });

  it('keeps local mode when initial server request fails with offline-like or generic errors', async () => {
    const localMovie = buildMovie('local', 'Local', '2026-04-01');

    const offlineApi = {
      getMoviesPage: vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockRejectedValue(new ApiNetworkError('Offline')),
    };

    const genericApi = {
      getMoviesPage: vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockRejectedValue(new Error('Unexpected boom')),
    };

    const offlineRender = renderHook(() =>
      useMovieDiaryPage([localMovie], {
        forceServerPaging: true,
        api: offlineApi,
      }),
    );

    await waitFor(() => {
      expect(offlineApi.getMoviesPage).toHaveBeenCalledTimes(1);
      expect(offlineRender.result.current.totalMovies).toBe(1);
    });

    const genericRender = renderHook(() =>
      useMovieDiaryPage([localMovie], {
        forceServerPaging: true,
        api: genericApi,
      }),
    );

    await waitFor(() => {
      expect(genericApi.getMoviesPage).toHaveBeenCalledTimes(1);
      expect(genericRender.result.current.totalMovies).toBe(1);
    });
  });

  it('does not apply first-page results after the hook is unmounted', async () => {
    const movieA = buildMovie('a', 'Movie A', '2026-05-01');

    let resolvePage: ((payload: MoviesPagePayload) => void) | undefined;
    const getMoviesPage = vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePage = resolve;
        }),
    );

    const { unmount } = renderHook(() =>
      useMovieDiaryPage([], {
        forceServerPaging: true,
        api: { getMoviesPage },
      }),
    );

    unmount();

    await act(async () => {
      resolvePage?.(buildPage(1, [movieA], false));
      await Promise.resolve();
    });

    expect(getMoviesPage).toHaveBeenCalledTimes(1);
  });

  it('skips prefetch call when next-page number is invalid', async () => {
    const movieA = buildMovie('a', 'Movie A', '2026-06-01');
    const getMoviesPage = vi.fn<Pick<MovieDiaryApi, 'getMoviesPage'>['getMoviesPage']>().mockImplementation(async () => {
      return buildPage(-1, [movieA], true);
    });

    const { result } = renderHook(() =>
      useMovieDiaryPage([], {
        forceServerPaging: true,
        api: { getMoviesPage },
      }),
    );

    await waitFor(() => {
      expect(result.current.totalMovies).toBe(1);
    });

    expect(getMoviesPage).not.toHaveBeenCalledWith(0, 12);
  });
});

