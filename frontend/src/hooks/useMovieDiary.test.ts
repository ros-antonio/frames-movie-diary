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

  it('loads more items in batches and clamps at total length', () => {
    const movieLogs = Array.from({ length: 7 }, (_, index) =>
      buildMovie(String(index + 1), `Movie ${index + 1}`, `2026-01-${String(index + 1).padStart(2, '0')}`),
    );

    const { result } = renderHook(() => useMovieDiary(movieLogs, 3));

    expect(result.current.currentMovies).toHaveLength(3);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.currentMovies).toHaveLength(6);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    expect(result.current.currentMovies).toHaveLength(7);
    expect(result.current.hasMore).toBe(false);
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

