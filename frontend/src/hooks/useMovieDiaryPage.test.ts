import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('useMovieDiaryPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockUseMovieDiary.mockReset();
    mockTrackPreference.mockReset();
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
});

