import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMovieDetail } from './useMovieDetail';

describe('useMovieDetail', () => {
  it('deletes when user confirms', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { result } = renderHook(() =>
      useMovieDetail(
        {
          id: 'movie-1',
          movieName: 'The Matrix',
          watchDate: '2026-02-02',
          frames: [],
        },
        onDelete,
      ),
    );

    result.current.handleDelete();

    expect(onDelete).toHaveBeenCalledWith('movie-1');
  });

  it('does not delete when user cancels', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() =>
      useMovieDetail(
        {
          id: 'movie-2',
          movieName: 'Inception',
          watchDate: '2026-03-03',
          frames: [],
        },
        onDelete,
      ),
    );

    result.current.handleDelete();

    expect(onDelete).not.toHaveBeenCalled();
  });
});

