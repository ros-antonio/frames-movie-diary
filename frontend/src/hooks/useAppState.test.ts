import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppState } from './useAppState';
import { ApiHttpError, ApiNetworkError, movieDiaryApi } from '../api/movieDiaryApi';

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function seedCachedMovies(movies: Array<{ id: string; movieName: string; watchDate: string; frames: unknown[] }>) {
  localStorage.setItem('movie-diary.movies-cache.v1', JSON.stringify(movies));
}

function seedCachedLists(lists: Array<{ id: string; name: string; description: string; movieIds: string[] }>) {
  localStorage.setItem('movie-diary.lists-cache.v1', JSON.stringify(lists));
}

function seedPendingOperations(operations: unknown[]) {
  localStorage.setItem('movie-diary.offline-queue.v1', JSON.stringify(operations));
}

describe('useAppState', () => {
  beforeEach(() => {
    localStorage.clear();
    setNavigatorOnline(true);
    vi.restoreAllMocks();

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

  it('adds uploaded frame data to a movie', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Inception', watchDate: '2026-08-12' });
      result.current.handleAddFrameToMovie('00000000-0000-4000-8000-000000000001', {
        imageUrl: 'data:image/png;base64,AAAA',
        timestamp: '00:42:10',
        caption: 'Hallway scene',
      });
    });

    expect(result.current.movieLogs[0].frames).toHaveLength(1);
    expect(result.current.movieLogs[0].frames[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000002',
      imageUrl: 'data:image/png;base64,AAAA',
      timestamp: '00:42:10',
      caption: 'Hallway scene',
    });
  });

  it('deletes a frame from a movie by frame id', () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.handleAddMovie({ movieName: 'Inception', watchDate: '2026-08-12' });
      result.current.handleAddFrameToMovie('00000000-0000-4000-8000-000000000001', {
        imageUrl: 'data:image/png;base64,AAAA',
        timestamp: '00:42:10',
        caption: 'Hallway scene',
      });
      result.current.handleAddFrameToMovie('00000000-0000-4000-8000-000000000001', {
        imageUrl: 'data:image/png;base64,BBBB',
        timestamp: '00:50:00',
        caption: 'Snow fight',
      });
    });

    act(() => {
      result.current.handleDeleteFrameFromMovie(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
      );
    });

    expect(result.current.movieLogs[0].frames).toHaveLength(1);
    expect(result.current.movieLogs[0].frames[0].caption).toBe('Snow fight');
  });

  it('queues create operations when backend is unreachable', async () => {
    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleAddMovie({ movieName: 'Offline Movie', watchDate: '2026-09-01' });
    });

    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0].movieName).toBe('Offline Movie');
    expect(result.current.isOffline).toBe(true);
    expect(result.current.pendingSyncCount).toBe(1);
  });

  it('replays queued operations when connection returns', async () => {
    setNavigatorOnline(false);

    vi.spyOn(movieDiaryApi, 'getAllMovies')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'server-movie-id',
          movieName: 'Synced Movie',
          watchDate: '2026-09-02',
          frames: [],
        },
      ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockResolvedValue({
      id: 'server-movie-id',
      movieName: 'Synced Movie',
      watchDate: '2026-09-02',
      frames: [],
    });

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleAddMovie({ movieName: 'Synced Movie', watchDate: '2026-09-02' });
    });

    expect(result.current.pendingSyncCount).toBe(1);
    expect(result.current.isOffline).toBe(true);

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.movieLogs[0].id).toBe('server-movie-id');
  });

  it('ignores missing resources for queued delete operations during sync', async () => {
    setNavigatorOnline(false);
    seedCachedMovies([
      {
        id: 'movie-to-delete',
        movieName: 'Ghost Movie',
        watchDate: '2026-09-03',
        frames: [],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'deleteMovie').mockRejectedValue(new ApiHttpError(404, 'Movie not found'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleDeleteMovie('movie-to-delete');
    });

    expect(result.current.pendingSyncCount).toBe(1);

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.operationError).toBeNull();
  });

  it('keeps queued operations and exposes error when sync fails with server error', async () => {
    setNavigatorOnline(false);
    seedCachedMovies([
      {
        id: 'movie-server-error',
        movieName: 'Broken Sync',
        watchDate: '2026-09-04',
        frames: [],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'deleteMovie').mockRejectedValue(new ApiHttpError(500, 'Server exploded'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleDeleteMovie('movie-server-error');
    });

    expect(result.current.pendingSyncCount).toBe(1);

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(result.current.pendingSyncCount).toBe(1);
    expect(result.current.operationError).toBe('Server exploded');
  });

  it('auto-syncs queued operations when the browser emits online event', async () => {
    setNavigatorOnline(false);
    seedPendingOperations([
      {
        id: 'queued-create-movie',
        createdAt: '2026-09-05T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-movie-id',
        movie: {
          movieName: 'Auto Synced Movie',
          watchDate: '2026-09-05',
        },
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'server-auto-id',
          movieName: 'Auto Synced Movie',
          watchDate: '2026-09-05',
          frames: [],
        },
      ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    const createMovieSpy = vi.spyOn(movieDiaryApi, 'createMovie').mockResolvedValue({
      id: 'server-auto-id',
      movieName: 'Auto Synced Movie',
      watchDate: '2026-09-05',
      frames: [],
    });

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(1);
    });

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(0);
    });

    expect(createMovieSpy).toHaveBeenCalledWith({ movieName: 'Auto Synced Movie', watchDate: '2026-09-05' });
    expect(result.current.isOffline).toBe(false);
  });

  it('ignores 409 conflicts for queued frame delete operations during sync', async () => {
    setNavigatorOnline(false);
    seedCachedMovies([
      {
        id: 'movie-with-frame',
        movieName: 'Frame Conflict Movie',
        watchDate: '2026-09-06',
        frames: [
          {
            id: 'frame-to-delete',
            imageUrl: 'data:image/png;base64,AAAA',
            timestamp: '00:00:10',
            caption: 'First frame',
          },
        ],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    const deleteFrameSpy = vi
      .spyOn(movieDiaryApi, 'deleteFrame')
      .mockRejectedValue(new ApiHttpError(409, 'Frame already removed'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      await result.current.handleDeleteFrameFromMovie('movie-with-frame', 'frame-to-delete');
    });

    expect(result.current.pendingSyncCount).toBe(1);

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(deleteFrameSpy).toHaveBeenCalledWith('movie-with-frame', 'frame-to-delete');
    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.operationError).toBeNull();
  });

  it('replays every queued operation type and maps temporary ids', async () => {
    setNavigatorOnline(false);
    seedPendingOperations([
      {
        id: 'op-1',
        createdAt: '2026-09-07T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-movie-id',
        movie: { movieName: 'Queued Movie', watchDate: '2026-09-07' },
      },
      {
        id: 'op-2',
        createdAt: '2026-09-07T10:00:01.000Z',
        type: 'updateMovie',
        movieId: 'temp-movie-id',
        movie: { movieName: 'Queued Movie Updated', watchDate: '2026-09-07', rating: 4 },
      },
      {
        id: 'op-3',
        createdAt: '2026-09-07T10:00:02.000Z',
        type: 'addFrame',
        movieId: 'temp-movie-id',
        frame: { imageUrl: 'data:image/png;base64,AAAA', timestamp: '00:10:10', caption: 'Queued frame' },
      },
      {
        id: 'op-4',
        createdAt: '2026-09-07T10:00:03.000Z',
        type: 'deleteFrame',
        movieId: 'temp-movie-id',
        frameId: 'frame-to-delete',
      },
      {
        id: 'op-5',
        createdAt: '2026-09-07T10:00:04.000Z',
        type: 'createList',
        tempId: 'temp-list-id',
        name: 'Queued List',
        description: 'Created offline',
      },
      {
        id: 'op-6',
        createdAt: '2026-09-07T10:00:05.000Z',
        type: 'addMovieToList',
        listId: 'temp-list-id',
        movieId: 'temp-movie-id',
      },
      {
        id: 'op-7',
        createdAt: '2026-09-07T10:00:06.000Z',
        type: 'removeMovieFromList',
        listId: 'temp-list-id',
        movieId: 'temp-movie-id',
      },
      {
        id: 'op-8',
        createdAt: '2026-09-07T10:00:07.000Z',
        type: 'deleteList',
        listId: 'temp-list-id',
      },
      {
        id: 'op-9',
        createdAt: '2026-09-07T10:00:08.000Z',
        type: 'deleteMovie',
        movieId: 'temp-movie-id',
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.spyOn(movieDiaryApi, 'getAllLists')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockResolvedValue({
      id: 'server-movie-id',
      movieName: 'Queued Movie',
      watchDate: '2026-09-07',
      frames: [],
    });
    const updateMovieSpy = vi.spyOn(movieDiaryApi, 'updateMovie').mockResolvedValue({
      id: 'server-movie-id',
      movieName: 'Queued Movie Updated',
      watchDate: '2026-09-07',
      rating: 4,
      frames: [],
    });
    const addFrameSpy = vi.spyOn(movieDiaryApi, 'addFrame').mockResolvedValue({
      id: 'frame-new',
      imageUrl: 'data:image/png;base64,AAAA',
      timestamp: '00:10:10',
      caption: 'Queued frame',
    });
    const deleteFrameSpy = vi.spyOn(movieDiaryApi, 'deleteFrame').mockResolvedValue();
    vi.spyOn(movieDiaryApi, 'createList').mockResolvedValue({
      id: 'server-list-id',
      name: 'Queued List',
      description: 'Created offline',
      movieIds: [],
    });
    const addMovieToListSpy = vi.spyOn(movieDiaryApi, 'addMovieToList').mockResolvedValue({
      id: 'server-list-id',
      name: 'Queued List',
      description: 'Created offline',
      movieIds: ['server-movie-id'],
    });
    const removeMovieFromListSpy = vi.spyOn(movieDiaryApi, 'removeMovieFromList').mockResolvedValue({
      id: 'server-list-id',
      name: 'Queued List',
      description: 'Created offline',
      movieIds: [],
    });
    const deleteListSpy = vi.spyOn(movieDiaryApi, 'deleteList').mockResolvedValue();
    const deleteMovieSpy = vi.spyOn(movieDiaryApi, 'deleteMovie').mockResolvedValue();

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(9);
    });

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(updateMovieSpy).toHaveBeenCalledWith('server-movie-id', {
      movieName: 'Queued Movie Updated',
      watchDate: '2026-09-07',
      rating: 4,
    });
    expect(addFrameSpy).toHaveBeenCalledWith('server-movie-id', {
      imageUrl: 'data:image/png;base64,AAAA',
      timestamp: '00:10:10',
      caption: 'Queued frame',
    });
    expect(deleteFrameSpy).toHaveBeenCalledWith('server-movie-id', 'frame-to-delete');
    expect(addMovieToListSpy).toHaveBeenCalledWith('server-list-id', 'server-movie-id');
    expect(removeMovieFromListSpy).toHaveBeenCalledWith('server-list-id', 'server-movie-id');
    expect(deleteListSpy).toHaveBeenCalledWith('server-list-id');
    expect(deleteMovieSpy).toHaveBeenCalledWith('server-movie-id');
    expect(result.current.pendingSyncCount).toBe(0);
  });

  it('sets refresh error when sync succeeds but final refresh fails', async () => {
    setNavigatorOnline(false);
    seedPendingOperations([
      {
        id: 'op-refresh',
        createdAt: '2026-09-08T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-refresh-id',
        movie: { movieName: 'Needs refresh', watchDate: '2026-09-08' },
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies')
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Refresh failed'));
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockResolvedValue({
      id: 'server-refresh-id',
      movieName: 'Needs refresh',
      watchDate: '2026-09-08',
      frames: [],
    });

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(1);
    });

    setNavigatorOnline(true);

    await act(async () => {
      await result.current.syncPendingOperations();
    });

    expect(result.current.operationError).toBe('Refresh failed');
  });

  it('returns false and sets operation error for non-offline backend failures', async () => {
    setNavigatorOnline(true);
    seedCachedMovies([
      {
        id: 'movie-existing',
        movieName: 'Existing movie',
        watchDate: '2026-09-09',
        frames: [],
      },
    ]);
    seedCachedLists([
      {
        id: 'list-existing',
        name: 'Existing list',
        description: 'desc',
        movieIds: ['movie-existing'],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockRejectedValue(new Error('Create failed'));
    vi.spyOn(movieDiaryApi, 'updateMovie').mockRejectedValue(new Error('Update failed'));
    vi.spyOn(movieDiaryApi, 'deleteMovie').mockRejectedValue(new Error('Delete failed'));
    vi.spyOn(movieDiaryApi, 'createList').mockRejectedValue(new Error('Create list failed'));
    vi.spyOn(movieDiaryApi, 'deleteList').mockRejectedValue(new Error('Delete list failed'));
    vi.spyOn(movieDiaryApi, 'addMovieToList').mockRejectedValue(new Error('Add membership failed'));
    vi.spyOn(movieDiaryApi, 'removeMovieFromList').mockRejectedValue(new Error('Remove membership failed'));
    vi.spyOn(movieDiaryApi, 'addFrame').mockRejectedValue(new Error('Add frame failed'));
    vi.spyOn(movieDiaryApi, 'deleteFrame').mockRejectedValue(new Error('Delete frame failed'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
    });

    await act(async () => {
      expect(await result.current.handleAddMovie({ movieName: 'X', watchDate: '2026-09-09' })).toBe(false);
      expect(await result.current.handleUpdateMovie('movie-existing', { movieName: 'Y', watchDate: '2026-09-09' })).toBe(false);
      expect(await result.current.handleDeleteMovie('movie-existing')).toBe(false);
      expect(await result.current.handleCreateList('L', 'D')).toBe(false);
      expect(await result.current.handleDeleteList('list-existing')).toBe(false);
      expect(await result.current.handleAddMovieToList('list-existing', 'movie-existing')).toBe(false);
      expect(await result.current.handleRemoveMovieFromList('list-existing', 'movie-existing')).toBe(false);
      expect(
        await result.current.handleAddFrameToMovie('movie-existing', {
          imageUrl: 'data:image/png;base64,AAAA',
          timestamp: '00:10:00',
          caption: 'Cap',
        }),
      ).toBe(false);
      expect(await result.current.handleDeleteFrameFromMovie('movie-existing', 'frame-x')).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.operationError).toBe('Delete frame failed');
    });

    expect(result.current.pendingSyncCount).toBe(0);
  });

  it('updates local state from successful backend list and frame operations', async () => {
    setNavigatorOnline(true);
    const seededMovies = [
      {
        id: 'movie-existing',
        movieName: 'Existing movie',
        watchDate: '2026-09-10',
        frames: [
          {
            id: 'frame-old',
            imageUrl: 'data:image/png;base64,OLD',
            timestamp: '00:00:10',
            caption: 'Old',
          },
        ],
      },
    ];
    const seededLists = [
      {
        id: 'list-existing',
        name: 'Existing list',
        description: 'desc',
        movieIds: [],
      },
    ];

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue(seededMovies);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue(seededLists);
    vi.spyOn(movieDiaryApi, 'addMovieToList').mockResolvedValue({
      id: 'list-existing',
      name: 'Existing list',
      description: 'desc',
      movieIds: ['movie-existing'],
    });
    vi.spyOn(movieDiaryApi, 'removeMovieFromList').mockResolvedValue({
      id: 'list-existing',
      name: 'Existing list',
      description: 'desc',
      movieIds: [],
    });
    vi.spyOn(movieDiaryApi, 'addFrame').mockResolvedValue({
      id: 'frame-new',
      imageUrl: 'data:image/png;base64,NEW',
      timestamp: '00:01:00',
      caption: 'New frame',
    });
    vi.spyOn(movieDiaryApi, 'deleteFrame').mockResolvedValue();

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
      expect(result.current.customLists).toHaveLength(1);
    });

    await act(async () => {
      expect(await result.current.handleAddMovieToList('list-existing', 'movie-existing')).toBe(true);
      expect(await result.current.handleRemoveMovieFromList('list-existing', 'movie-existing')).toBe(true);
      expect(
        await result.current.handleAddFrameToMovie('movie-existing', {
          imageUrl: 'data:image/png;base64,NEW',
          timestamp: '00:01:00',
          caption: 'New frame',
        }),
      ).toBe(true);
      expect(await result.current.handleDeleteFrameFromMovie('movie-existing', 'frame-new')).toBe(true);
    });

    expect(result.current.customLists[0].movieIds).toEqual([]);
    expect(result.current.movieLogs[0].frames.map((frame) => frame.id)).toEqual(['frame-old']);
  });

  it('queues list/frame operations when network errors happen while online', async () => {
    setNavigatorOnline(true);
    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      { id: 'movie-existing', movieName: 'Existing movie', watchDate: '2026-09-11', frames: [] },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([
      { id: 'list-existing', name: 'Existing list', description: 'desc', movieIds: [] },
    ]);
    vi.spyOn(movieDiaryApi, 'addMovieToList').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'removeMovieFromList').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'addFrame').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'deleteFrame').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
      expect(result.current.customLists).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleAddMovieToList('list-existing', 'movie-existing');
      await result.current.handleRemoveMovieFromList('list-existing', 'movie-existing');
      await result.current.handleAddFrameToMovie('movie-existing', {
        imageUrl: 'data:image/png;base64,AA',
        timestamp: '00:01:00',
        caption: 'Queued frame',
      });
      await result.current.handleDeleteFrameFromMovie('movie-existing', 'missing-frame');
    });

    expect(result.current.isOffline).toBe(true);
    expect(result.current.pendingSyncCount).toBe(4);
  });

  it('queues operations immediately when browser is offline at call time', async () => {
    setNavigatorOnline(true);
    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      { id: 'movie-existing', movieName: 'Existing movie', watchDate: '2026-09-12', frames: [] },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([
      { id: 'list-existing', name: 'Existing list', description: 'desc', movieIds: ['movie-existing'] },
    ]);

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
    });

    setNavigatorOnline(false);

    await act(async () => {
      await result.current.handleDeleteList('list-existing');
      await result.current.handleAddMovieToList('list-existing', 'movie-existing');
      await result.current.handleRemoveMovieFromList('list-existing', 'movie-existing');
      await result.current.handleAddFrameToMovie('movie-existing', {
        imageUrl: 'data:image/png;base64,BB',
        timestamp: '00:02:00',
        caption: 'Offline frame',
      });
    });

    expect(result.current.pendingSyncCount).toBe(4);
    expect(result.current.isOffline).toBe(true);
  });

  it('handles successful backend movie and list mutations', async () => {
    setNavigatorOnline(true);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      {
        id: 'movie-existing',
        movieName: 'Existing movie',
        watchDate: '2026-09-13',
        frames: [],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([
      {
        id: 'list-existing',
        name: 'Existing list',
        description: 'desc',
        movieIds: ['movie-existing'],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockResolvedValue({
      id: 'movie-created',
      movieName: 'Created movie',
      watchDate: '2026-09-13',
      frames: [],
    });
    vi.spyOn(movieDiaryApi, 'updateMovie').mockResolvedValue({
      id: 'movie-existing',
      movieName: 'Existing movie updated',
      watchDate: '2026-09-13',
      frames: [],
    });
    vi.spyOn(movieDiaryApi, 'deleteMovie').mockResolvedValue();
    vi.spyOn(movieDiaryApi, 'createList').mockResolvedValue({
      id: 'list-created',
      name: 'Created list',
      description: 'new',
      movieIds: [],
    });
    vi.spyOn(movieDiaryApi, 'deleteList').mockResolvedValue();

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
      expect(result.current.customLists).toHaveLength(1);
    });

    await act(async () => {
      expect(await result.current.handleAddMovie({ movieName: 'Created movie', watchDate: '2026-09-13' })).toBe(true);
      expect(
        await result.current.handleUpdateMovie('movie-existing', {
          movieName: 'Existing movie updated',
          watchDate: '2026-09-13',
        }),
      ).toBe(true);
      expect(await result.current.handleDeleteMovie('movie-existing')).toBe(true);
      expect(await result.current.handleCreateList('Created list', 'new')).toBe(true);
      expect(await result.current.handleDeleteList('list-existing')).toBe(true);
    });

    expect(result.current.isOffline).toBe(false);
    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.movieLogs.map((movie) => movie.id)).toEqual(['movie-created']);
    expect(result.current.customLists.map((list) => list.id)).toEqual(['list-created']);
  });

  it('queues update/delete/create-list/delete-list when online requests fail with network errors', async () => {
    setNavigatorOnline(true);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      {
        id: 'movie-existing',
        movieName: 'Existing movie',
        watchDate: '2026-09-14',
        frames: [],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([
      {
        id: 'list-existing',
        name: 'Existing list',
        description: 'desc',
        movieIds: ['movie-existing'],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'updateMovie').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'deleteMovie').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'createList').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'deleteList').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
      expect(result.current.customLists).toHaveLength(1);
    });

    await act(async () => {
      expect(
        await result.current.handleUpdateMovie('movie-existing', {
          movieName: 'Offline updated movie',
          watchDate: '2026-09-14',
        }),
      ).toBe(true);
      expect(await result.current.handleDeleteMovie('movie-existing')).toBe(true);
      expect(await result.current.handleCreateList('Offline list', 'queued create')).toBe(true);
      expect(await result.current.handleDeleteList('list-existing')).toBe(true);
    });

    expect(result.current.isOffline).toBe(true);
    expect(result.current.pendingSyncCount).toBe(4);
    expect(result.current.movieLogs).toEqual([]);
    expect(result.current.customLists[0].name).toBe('Offline list');
  });

  it('queues update and create-list immediately when browser is offline', async () => {
    setNavigatorOnline(true);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      {
        id: 'movie-existing',
        movieName: 'Existing movie',
        watchDate: '2026-09-15',
        frames: [],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(1);
    });

    setNavigatorOnline(false);

    await act(async () => {
      expect(
        await result.current.handleUpdateMovie('movie-existing', {
          movieName: 'Offline direct update',
          watchDate: '2026-09-15',
        }),
      ).toBe(true);
      expect(await result.current.handleCreateList('Offline direct list', 'queued immediately')).toBe(true);
    });

    expect(result.current.movieLogs[0].movieName).toBe('Offline direct update');
    expect(result.current.customLists[0].name).toBe('Offline direct list');
    expect(result.current.pendingSyncCount).toBe(2);
    expect(result.current.isOffline).toBe(true);
  });

  it('adds frame to only the targeted movie for successful backend add-frame', async () => {
    setNavigatorOnline(true);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([
      {
        id: 'movie-a',
        movieName: 'Movie A',
        watchDate: '2026-09-16',
        frames: [],
      },
      {
        id: 'movie-b',
        movieName: 'Movie B',
        watchDate: '2026-09-16',
        frames: [],
      },
    ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'addFrame').mockResolvedValue({
      id: 'frame-added',
      imageUrl: 'data:image/png;base64,CC',
      timestamp: '00:03:00',
      caption: 'Targeted frame',
    });

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.movieLogs).toHaveLength(2);
    });

    await act(async () => {
      expect(
        await result.current.handleAddFrameToMovie('movie-b', {
          imageUrl: 'data:image/png;base64,CC',
          timestamp: '00:03:00',
          caption: 'Targeted frame',
        }),
      ).toBe(true);
    });

    const movieA = result.current.movieLogs.find((movie) => movie.id === 'movie-a');
    const movieB = result.current.movieLogs.find((movie) => movie.id === 'movie-b');

    expect(movieA?.frames).toEqual([]);
    expect(movieB?.frames.map((frame) => frame.id)).toEqual(['frame-added']);
  });

  it('ignores cached movie and list bootstrap when starting online', async () => {
    setNavigatorOnline(true);
    seedCachedMovies([
      {
        id: 'cached-online-movie',
        movieName: 'Should not hydrate online',
        watchDate: '2026-09-17',
        frames: [],
      },
    ]);
    seedCachedLists([
      {
        id: 'cached-online-list',
        name: 'Online cache list',
        description: 'Should not hydrate online',
        movieIds: [],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    expect(result.current.movieLogs).toEqual([]);
    expect(result.current.customLists).toEqual([]);

    await waitFor(() => {
      expect(movieDiaryApi.getAllMovies).toHaveBeenCalled();
      expect(movieDiaryApi.getAllLists).toHaveBeenCalled();
    });
  });

  it('hydrates cached movie and list bootstrap when starting offline', async () => {
    setNavigatorOnline(false);
    seedCachedMovies([
      {
        id: 'cached-offline-movie',
        movieName: 'Hydrated offline',
        watchDate: '2026-09-17',
        frames: [],
      },
    ]);
    seedCachedLists([
      {
        id: 'cached-offline-list',
        name: 'Offline cache list',
        description: 'Hydrated offline',
        movieIds: ['cached-offline-movie'],
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'getAllLists').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    expect(result.current.movieLogs.map((movie) => movie.id)).toEqual(['cached-offline-movie']);
    expect(result.current.customLists.map((list) => list.id)).toEqual(['cached-offline-list']);
  });

  it('trims persisted movie cache to the newest 500 entries', async () => {
    setNavigatorOnline(false);
    seedCachedMovies(
      Array.from({ length: 501 }, (_, index) => ({
        id: `movie-${index + 1}`,
        movieName: `Movie ${index + 1}`,
        watchDate: '2026-09-17',
        frames: [],
      })),
    );
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);

    renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      const persistedMovies = JSON.parse(localStorage.getItem('movie-diary.movies-cache.v1') ?? '[]') as Array<{
        id: string;
      }>;

      expect(persistedMovies).toHaveLength(500);
      expect(persistedMovies[0]?.id).toBe('movie-1');
      expect(persistedMovies[persistedMovies.length - 1]?.id).toBe('movie-500');
    });
  });

  it('trims persisted offline operations to the newest 50 entries', async () => {
    setNavigatorOnline(false);
    seedPendingOperations(
      Array.from({ length: 51 }, (_, index) => ({
        id: `queued-op-${index + 1}`,
        createdAt: `2026-09-17T10:${String(index).padStart(2, '0')}:00.000Z`,
        type: 'createMovie',
        tempId: `temp-${index + 1}`,
        movie: {
          movieName: `Queued Movie ${index + 1}`,
          watchDate: '2026-09-17',
        },
      })),
    );
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);

    renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      const persistedQueue = JSON.parse(localStorage.getItem('movie-diary.offline-queue.v1') ?? '[]') as Array<{
        id: string;
      }>;

      expect(persistedQueue).toHaveLength(50);
      expect(persistedQueue[0]?.id).toBe('queued-op-2');
      expect(persistedQueue[persistedQueue.length - 1]?.id).toBe('queued-op-51');
    });
  });

  it('restores queued offline-created movies when movie cache is stale after refresh', async () => {
    setNavigatorOnline(false);
    seedCachedMovies([]);
    seedPendingOperations([
      {
        id: 'queued-create',
        createdAt: '2026-09-17T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-offline-movie',
        movie: {
          movieName: 'Recovered Offline Movie',
          watchDate: '2026-09-17',
        },
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockRejectedValue(new ApiNetworkError('Failed to fetch'));
    vi.spyOn(movieDiaryApi, 'getAllLists').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
    });

    expect(result.current.pendingSyncCount).toBe(1);
    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0]).toMatchObject({
      id: 'temp-offline-movie',
      movieName: 'Recovered Offline Movie',
      watchDate: '2026-09-17',
    });
  });

  it('keeps queued offline-created movies visible after successful initial backend fetch', async () => {
    setNavigatorOnline(true);
    seedCachedMovies([]);
    seedPendingOperations([
      {
        id: 'queued-create-fetch-race',
        createdAt: '2026-09-18T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-fetch-race-movie',
        movie: {
          movieName: 'Visible During Fetch Race',
          watchDate: '2026-09-18',
        },
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);
    vi.spyOn(movieDiaryApi, 'createMovie').mockRejectedValue(new ApiNetworkError('Failed to fetch'));

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(1);
      expect(result.current.isOffline).toBe(true);
    });

    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0]).toMatchObject({
      id: 'temp-fetch-race-movie',
      movieName: 'Visible During Fetch Race',
      watchDate: '2026-09-18',
    });
  });

  it('reuses in-flight sync and does not replay createMovie twice', async () => {
    setNavigatorOnline(true);
    seedPendingOperations([
      {
        id: 'op-single-flight',
        createdAt: '2026-09-19T10:00:00.000Z',
        type: 'createMovie',
        tempId: 'temp-single-flight',
        movie: { movieName: 'Single Flight Movie', watchDate: '2026-09-19' },
      },
    ]);

    vi.spyOn(movieDiaryApi, 'getAllMovies')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'server-single-flight', movieName: 'Single Flight Movie', watchDate: '2026-09-19', frames: [] },
      ]);
    vi.spyOn(movieDiaryApi, 'getAllLists').mockResolvedValue([]);

    let resolveCreate: ((value: { id: string; movieName: string; watchDate: string; frames: never[] }) => void) | undefined;
    const createMovieSpy = vi.spyOn(movieDiaryApi, 'createMovie').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const { result } = renderHook(() => useAppState({ forceBackend: true }));

    await waitFor(() => {
      expect(result.current.pendingSyncCount).toBe(1);
    });

    const firstSync = result.current.syncPendingOperations();
    const secondSync = result.current.syncPendingOperations();

    expect(createMovieSpy).toHaveBeenCalledTimes(1);

    resolveCreate?.({
      id: 'server-single-flight',
      movieName: 'Single Flight Movie',
      watchDate: '2026-09-19',
      frames: [],
    });

    await act(async () => {
      await Promise.all([firstSync, secondSync]);
    });

    expect(createMovieSpy).toHaveBeenCalledTimes(1);
    expect(result.current.pendingSyncCount).toBe(0);
    expect(result.current.movieLogs).toHaveLength(1);
    expect(result.current.movieLogs[0].id).toBe('server-single-flight');
  });
});

