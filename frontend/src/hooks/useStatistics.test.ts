import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { movieDiaryApi } from '../api/movieDiaryApi';
import { getBarColor, useStatistics } from './useStatistics';

describe('useStatistics', () => {
  it('computes local statistics when backend mode is disabled', () => {
    const { result } = renderHook(() =>
      useStatistics([
        { id: 'm1', movieName: 'A', watchDate: '2026-01-01', rating: 4, frames: [] },
        { id: 'm2', movieName: 'B', watchDate: '2026-01-02', rating: 4, frames: [] },
        { id: 'm3', movieName: 'C', watchDate: '2026-01-03', frames: [] },
      ]),
    );

    expect(result.current.totalMovies).toBe(3);
    expect(result.current.averageRating).toBe(4);
    expect(result.current.mostCommonRating).toBe('4');
    expect(result.current.ratingData.find((entry) => entry.rating === '4')?.count).toBe(2);
  });

  it('uses backend overview when forceBackend is enabled', async () => {
    vi.spyOn(movieDiaryApi, 'getStatisticsOverview').mockResolvedValue({
      totalMovies: 5,
      ratedMovies: 4,
      unratedMovies: 1,
      averageRating: 3.75,
      totalFrames: 0,
      moviesWithFrames: 0,
      topRatedMovies: [],
      ratingDistribution: {
        '0.5': 0,
        '1': 1,
        '1.5': 0,
        '2': 0,
        '2.5': 0,
        '3': 1,
        '3.5': 0,
        '4': 2,
        '4.5': 0,
        '5': 0,
      },
    });

    const { result } = renderHook(() => useStatistics([], { forceBackend: true }));

    await waitFor(() => {
      expect(result.current.totalMovies).toBe(5);
    });

    expect(result.current.averageRating).toBe(3.75);
    expect(result.current.mostCommonRating).toBe('4');
    expect(result.current.ratingData.find((entry) => entry.rating === '4')?.count).toBe(2);
  });

  it('falls back to local stats when backend overview request fails', async () => {
    vi.spyOn(movieDiaryApi, 'getStatisticsOverview').mockRejectedValue(new Error('backend down'));

    const { result } = renderHook(() =>
      useStatistics([{ id: 'm1', movieName: 'Only local', watchDate: '2026-01-01', rating: 5, frames: [] }], {
        forceBackend: true,
      }),
    );

    await waitFor(() => {
      expect(movieDiaryApi.getStatisticsOverview).toHaveBeenCalled();
    });

    expect(result.current.totalMovies).toBe(1);
    expect(result.current.averageRating).toBe(5);
    expect(result.current.mostCommonRating).toBe('5');
  });

  it('returns zero average and dash most common when local rated list is empty', () => {
    const { result } = renderHook(() =>
      useStatistics([
        { id: 'm1', movieName: 'No rating 1', watchDate: '2026-01-01', frames: [] },
        { id: 'm2', movieName: 'No rating 2', watchDate: '2026-01-02', frames: [] },
      ]),
    );

    expect(result.current.averageRating).toBe(0);
    expect(result.current.mostCommonRating).toBe('-');
  });

  it('maps bar colors for zero, known, and unknown ratings', () => {
    expect(getBarColor('5', 0)).toBe('rgba(74, 144, 226, 0.2)');
    expect(getBarColor('5', 2)).toBe('#FFD700');
    expect(getBarColor('unknown', 2)).toBe('#E0BAAA');
  });
});

