import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppState } from './useAppState';

describe('useAppState', () => {
  beforeEach(() => {
    let idCounter = 1;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(
      () => `00000000-0000-4000-8000-${String(idCounter++).padStart(12, '0')}`,
    );
  });

  it('handles movie CRUD operations', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Dune', watchDate: '2026-03-01', rating: 4.5 });
      result.current.handleAddMovie({ movieName: 'Arrival', watchDate: '2026-03-02' });
    });

    expect(result.current.movieLogs).toHaveLength(2);
    expect(result.current.movieLogs[0].movieName).toBe('Arrival');

    const dune = result.current.movieLogs.find((movie) => movie.movieName === 'Dune');
    expect(dune).toBeDefined();

    act(() => {
      result.current.handleUpdateMovie('00000000-0000-4000-8000-000000000001', {
        movieName: 'Dune: Part Two',
        watchDate: '2026-03-01',
        rating: 5,
        review: 'Great sequel',
      });
    });

    expect(
      result.current.movieLogs.find((movie) => movie.id === '00000000-0000-4000-8000-000000000001')
        ?.movieName,
    ).toBe('Dune: Part Two');
    expect(
      result.current.movieLogs.find((movie) => movie.id === '00000000-0000-4000-8000-000000000001')
        ?.review,
    ).toBe('Great sequel');

    act(() => {
      result.current.handleDeleteMovie('00000000-0000-4000-8000-000000000002');
    });

    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0].id).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('keeps movies unchanged when updating a non-existing movie id', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Interstellar', watchDate: '2026-04-01' });
      result.current.handleUpdateMovie('missing-id', {
        movieName: 'No Change',
        watchDate: '2026-04-01',
      });
    });

    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0].movieName).toBe('Interstellar');
  });

  it('handles custom list create, add/remove movie, and delete', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'The Matrix', watchDate: '2026-05-01' });
      result.current.handleCreateList('Sci-Fi', 'Science fiction favorites');
    });

    expect(result.current.customLists).toHaveLength(1);
    expect(result.current.customLists[0].name).toBe('Sci-Fi');

    act(() => {
      result.current.handleAddMovieToList(
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
      );
    });

    expect(result.current.customLists[0].movieIds).toEqual(['00000000-0000-4000-8000-000000000001']);

    act(() => {
      result.current.handleRemoveMovieFromList(
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
      );
    });

    expect(result.current.customLists[0].movieIds).toEqual([]);

    act(() => {
      result.current.handleDeleteList('00000000-0000-4000-8000-000000000002');
    });

    expect(result.current.customLists).toEqual([]);
  });

  it('ignores list changes for non-existing list id', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Blade Runner', watchDate: '2026-06-01' });
      result.current.handleCreateList('Watchlist', 'To rewatch');
      result.current.handleAddMovieToList('missing-list', '00000000-0000-4000-8000-000000000001');
      result.current.handleRemoveMovieFromList('missing-list', '00000000-0000-4000-8000-000000000001');
    });

    expect(result.current.customLists[0].movieIds).toEqual([]);
  });

  it('removes deleted movie ids from every custom list', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Movie A', watchDate: '2026-07-01' });
      result.current.handleAddMovie({ movieName: 'Movie B', watchDate: '2026-07-02' });
      result.current.handleCreateList('List One', 'First');
      result.current.handleCreateList('List Two', 'Second');
      result.current.handleAddMovieToList(
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001',
      );
      result.current.handleAddMovieToList(
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000002',
      );
      result.current.handleAddMovieToList(
        '00000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000002',
      );
    });

    act(() => {
      result.current.handleDeleteMovie('00000000-0000-4000-8000-000000000002');
    });

    const listOne = result.current.customLists.find((list) => list.id === '00000000-0000-4000-8000-000000000003');
    const listTwo = result.current.customLists.find((list) => list.id === '00000000-0000-4000-8000-000000000004');

    expect(listOne?.movieIds).toEqual(['00000000-0000-4000-8000-000000000001']);
    expect(listTwo?.movieIds).toEqual([]);
  });

  it('keeps custom lists unchanged when deleting a movie not in any list', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Movie A', watchDate: '2026-08-01' });
      result.current.handleAddMovie({ movieName: 'Movie B', watchDate: '2026-08-02' });
      result.current.handleCreateList('Only A', 'Contains first movie');
      result.current.handleAddMovieToList(
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001',
      );
    });

    act(() => {
      result.current.handleDeleteMovie('00000000-0000-4000-8000-000000000002');
    });

    expect(result.current.customLists[0].movieIds).toEqual(['00000000-0000-4000-8000-000000000001']);
  });
});

