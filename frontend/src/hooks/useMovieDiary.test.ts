import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMovieDiary } from './useMovieDiary';
import type { MovieLog } from '../types';

function buildMovie(id: string, movieName: string, watchDate: string): MovieLog {
  return { id, movieName, watchDate, frames: [] };
}

describe('useMovieDiary', () => {
  it('sorts by movie name ascending then descending', () => {
    const movieLogs = [
      buildMovie('1', 'Zodiac', '2026-01-01'),
      buildMovie('2', 'Arrival', '2026-01-02'),
      buildMovie('3', 'Blade Runner', '2026-01-03'),
    ];

    const { result } = renderHook(() => useMovieDiary(movieLogs, 6));

    act(() => result.current.requestSort('movieName'));
    expect(result.current.currentMovies.map((m) => m.movieName)).toEqual(['Arrival', 'Blade Runner', 'Zodiac']);

    act(() => result.current.requestSort('movieName'));
    expect(result.current.currentMovies.map((m) => m.movieName)).toEqual(['Zodiac', 'Blade Runner', 'Arrival']);
  });

  it('clamps page when list shrinks', () => {
    const longList = [
      buildMovie('1', 'A', '2026-01-01'),
      buildMovie('2', 'B', '2026-01-02'),
      buildMovie('3', 'C', '2026-01-03'),
      buildMovie('4', 'D', '2026-01-04'),
      buildMovie('5', 'E', '2026-01-05'),
    ];
    const shortList = [buildMovie('1', 'A', '2026-01-01')];

    const { result, rerender } = renderHook(({ logs }) => useMovieDiary(logs, 2), {
      initialProps: { logs: longList },
    });

    act(() => result.current.setCurrentPage(3));
    expect(result.current.currentPage).toBe(3);

    rerender({ logs: shortList });

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.currentMovies).toHaveLength(1);
  });

  it('keeps stable order when compared values are equal', () => {
    const movieLogs = [
      buildMovie('1', 'Same', '2026-01-01'),
      buildMovie('2', 'Same', '2026-01-02'),
    ];

    const { result } = renderHook(() => useMovieDiary(movieLogs, 6));

    act(() => result.current.requestSort('movieName'));

    expect(result.current.currentMovies.map((m) => m.id)).toEqual(['1', '2']);
  });
});

