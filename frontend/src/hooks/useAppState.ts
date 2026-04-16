import { useCallback, useEffect, useRef, useState } from 'react';
import type { CustomList, MovieInput, MovieLog, SavedFrame } from '../types';
import { ApiHttpError, isOfflineLikeError, movieDiaryApi } from '../api/movieDiaryApi';

interface UseAppStateOptions {
  forceBackend?: boolean;
}

interface PendingOperationBase {
  id: string;
  createdAt: string;
}

type PendingOperationPayload =
  | { type: 'createMovie'; tempId: string; movie: MovieInput }
  | { type: 'updateMovie'; movieId: string; movie: MovieInput }
  | { type: 'deleteMovie'; movieId: string }
  | { type: 'createList'; tempId: string; name: string; description: string }
  | { type: 'deleteList'; listId: string }
  | { type: 'addMovieToList'; listId: string; movieId: string }
  | { type: 'removeMovieFromList'; listId: string; movieId: string }
  | { type: 'addFrame'; movieId: string; frame: Omit<SavedFrame, 'id'> }
  | { type: 'deleteFrame'; movieId: string; frameId: string };

type PendingOperation = PendingOperationBase & PendingOperationPayload;

const MOVIES_CACHE_KEY = 'movie-diary.movies-cache.v1';
const LISTS_CACHE_KEY = 'movie-diary.lists-cache.v1';
const OFFLINE_QUEUE_KEY = 'movie-diary.offline-queue.v1';

function readPersistedValue<T>(key: string, fallback: T): T {
  try {
    const rawValue = localStorage.getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function createPendingOperation(operation: PendingOperationPayload): PendingOperation {
  return {
    ...operation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

function shouldIgnoreSyncError(operation: PendingOperation, error: unknown): boolean {
  if (!(error instanceof ApiHttpError)) {
    return false;
  }

  if (error.status !== 404 && error.status !== 409) {
    return false;
  }

  return operation.type.startsWith('delete') || operation.type === 'removeMovieFromList';
}

function reconcileMoviesWithPendingOperations(movieLogs: MovieLog[], operations: PendingOperation[]): MovieLog[] {
  let changed = false;
  const reconciled = [...movieLogs];

  for (const operation of operations) {
    switch (operation.type) {
      case 'createMovie': {
        const exists = reconciled.some((movie) => movie.id === operation.tempId);
        if (!exists) {
          reconciled.unshift({
            ...operation.movie,
            id: operation.tempId,
            frames: [],
          });
          changed = true;
        }
        break;
      }
      case 'updateMovie': {
        const index = reconciled.findIndex((movie) => movie.id === operation.movieId);
        if (index >= 0) {
          reconciled[index] = {
            ...reconciled[index],
            ...operation.movie,
          };
          changed = true;
        }
        break;
      }
      case 'deleteMovie': {
        const before = reconciled.length;
        const filtered = reconciled.filter((movie) => movie.id !== operation.movieId);
        if (filtered.length !== before) {
          reconciled.splice(0, reconciled.length, ...filtered);
          changed = true;
        }
        break;
      }
      default:
        break;
    }
  }

  return changed ? reconciled : movieLogs;
}

export function useAppState(options?: UseAppStateOptions) {
  const useBackend = options?.forceBackend ?? import.meta.env.MODE !== 'test';
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>(() => {
    if (!useBackend) {
      return [];
    }

    const cachedMovies = readPersistedValue<MovieLog[]>(MOVIES_CACHE_KEY, []);
    const queuedOperations = readPersistedValue<PendingOperation[]>(OFFLINE_QUEUE_KEY, []);
    return reconcileMoviesWithPendingOperations(cachedMovies, queuedOperations);
  });
  const [customLists, setCustomLists] = useState<CustomList[]>(() =>
    (useBackend ? readPersistedValue<CustomList[]>(LISTS_CACHE_KEY, []) : []),
  );
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>(() =>
    (useBackend ? readPersistedValue<PendingOperation[]>(OFFLINE_QUEUE_KEY, []) : []),
  );
  const [isOffline, setIsOffline] = useState(() => (useBackend ? !navigator.onLine : false));
  const [operationError, setOperationError] = useState<string | null>(null);
  const inFlightSyncRef = useRef<Promise<boolean> | null>(null);

  const clearOperationError = () => {
    setOperationError(null);
  };

  const setErrorFromUnknown = (error: unknown, fallbackMessage: string) => {
    if (error instanceof Error && error.message.trim()) {
      setOperationError(error.message);
      return;
    }

    setOperationError(fallbackMessage);
  };

  const applyLocalAddMovie = useCallback((newMovie: MovieInput, id = crypto.randomUUID()): MovieLog => {
    const movie: MovieLog = {
      ...newMovie,
      id,
      frames: [],
    };

    setMovieLogs((prev) => [movie, ...prev]);
    return movie;
  }, []);

  const applyLocalUpdateMovie = useCallback((movieId: string, updatedMovieData: MovieInput) => {
    setMovieLogs((prev) =>
      prev.map((log) => {
        if (log.id === movieId) {
          return { ...log, ...updatedMovieData };
        }

        return log;
      }),
    );
  }, []);

  const applyLocalDeleteMovie = useCallback((movieId: string) => {
    setMovieLogs((prev) => prev.filter((movie) => movie.id !== movieId));
    setCustomLists((prev) =>
      prev.map((list) => ({
        ...list,
        movieIds: list.movieIds.filter((id) => id !== movieId),
      })),
    );
  }, []);

  const applyLocalCreateList = useCallback((name: string, description: string, id = crypto.randomUUID()): CustomList => {
    const newList: CustomList = {
      id,
      name,
      description,
      movieIds: [],
    };

    setCustomLists((prev) => [newList, ...prev]);
    return newList;
  }, []);

  const applyLocalDeleteList = useCallback((listId: string) => {
    setCustomLists((prev) => prev.filter((list) => list.id !== listId));
  }, []);

  const applyLocalAddMovieToList = useCallback((listId: string, movieId: string) => {
    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId && !list.movieIds.includes(movieId)) {
          return { ...list, movieIds: [...list.movieIds, movieId] };
        }

        return list;
      }),
    );
  }, []);

  const applyLocalRemoveMovieFromList = useCallback((listId: string, movieId: string) => {
    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return { ...list, movieIds: list.movieIds.filter((id) => id !== movieId) };
        }

        return list;
      }),
    );
  }, []);

  const applyLocalAddFrame = useCallback((movieId: string, frameData: Omit<SavedFrame, 'id'>) => {
    setMovieLogs((prev) =>
      prev.map((movie) => {
        if (movie.id !== movieId) {
          return movie;
        }

        return {
          ...movie,
          frames: [
            {
              ...frameData,
              id: crypto.randomUUID(),
            },
            ...movie.frames,
          ],
        };
      }),
    );
  }, []);

  const applyLocalDeleteFrame = useCallback((movieId: string, frameId: string) => {
    setMovieLogs((prev) =>
      prev.map((movie) => {
        if (movie.id !== movieId) {
          return movie;
        }

        return {
          ...movie,
          frames: movie.frames.filter((frame) => frame.id !== frameId),
        };
      }),
    );
  }, []);

  const enqueueOperation = useCallback((operation: PendingOperationPayload) => {
    setPendingOperations((prev) => [...prev, createPendingOperation(operation)]);
  }, []);

  const replayPendingOperations = useCallback(
    (operationsToReplay: PendingOperation[]): Promise<boolean> => {
      if (inFlightSyncRef.current) {
        return inFlightSyncRef.current;
      }

      const replayPromise = (async (): Promise<boolean> => {
      if (!useBackend || operationsToReplay.length === 0) {
        return true;
      }

      if (!navigator.onLine) {
        setIsOffline(true);
        return false;
      }

      const remaining = [...operationsToReplay];
      const movieIdMap = new Map<string, string>();
      const listIdMap = new Map<string, string>();

      const mapMovieId = (movieId: string) => movieIdMap.get(movieId) ?? movieId;
      const mapListId = (listId: string) => listIdMap.get(listId) ?? listId;

      while (remaining.length > 0) {
        const operation = remaining[0];

        try {
          switch (operation.type) {
            case 'createMovie': {
              const createdMovie = await movieDiaryApi.createMovie(operation.movie);
              movieIdMap.set(operation.tempId, createdMovie.id);
              break;
            }
            case 'updateMovie': {
              await movieDiaryApi.updateMovie(mapMovieId(operation.movieId), operation.movie);
              break;
            }
            case 'deleteMovie': {
              await movieDiaryApi.deleteMovie(mapMovieId(operation.movieId));
              break;
            }
            case 'createList': {
              const createdList = await movieDiaryApi.createList(operation.name, operation.description);
              listIdMap.set(operation.tempId, createdList.id);
              break;
            }
            case 'deleteList': {
              await movieDiaryApi.deleteList(mapListId(operation.listId));
              break;
            }
            case 'addMovieToList': {
              await movieDiaryApi.addMovieToList(mapListId(operation.listId), mapMovieId(operation.movieId));
              break;
            }
            case 'removeMovieFromList': {
              await movieDiaryApi.removeMovieFromList(mapListId(operation.listId), mapMovieId(operation.movieId));
              break;
            }
            case 'addFrame': {
              await movieDiaryApi.addFrame(mapMovieId(operation.movieId), operation.frame);
              break;
            }
            case 'deleteFrame': {
              await movieDiaryApi.deleteFrame(mapMovieId(operation.movieId), operation.frameId);
              break;
            }
            default:
              break;
          }

          remaining.shift();
          setPendingOperations([...remaining]);
        } catch (error: unknown) {
          if (shouldIgnoreSyncError(operation, error)) {
            remaining.shift();
            setPendingOperations([...remaining]);
            continue;
          }

          if (isOfflineLikeError(error)) {
            setIsOffline(true);
            return false;
          }

          setErrorFromUnknown(error, 'Could not sync offline changes.');
          return false;
        }
      }

      try {
        const [movies, lists] = await Promise.all([movieDiaryApi.getAllMovies(), movieDiaryApi.getAllLists()]);
        setMovieLogs(movies);
        setCustomLists(lists);
        clearOperationError();
      } catch (error: unknown) {
        if (isOfflineLikeError(error)) {
          setIsOffline(true);
          return false;
        }

        setErrorFromUnknown(error, 'Could not refresh data after sync.');
        return false;
      }

      setIsOffline(false);
      return true;
      })();

      inFlightSyncRef.current = replayPromise;
      replayPromise.finally(() => {
        if (inFlightSyncRef.current === replayPromise) {
          inFlightSyncRef.current = null;
        }
      });

      return replayPromise;
    },
    [useBackend],
  );

  const syncPendingOperations = useCallback(async (): Promise<boolean> => {
    return replayPendingOperations(pendingOperations);
  }, [pendingOperations, replayPendingOperations]);

  useEffect(() => {
    if (!useBackend) {
      return;
    }


    const queuedOperationsAtMount = readPersistedValue<PendingOperation[]>(OFFLINE_QUEUE_KEY, []);


    const handleOnline = () => {
      setIsOffline(false);
      void replayPendingOperations(readPersistedValue<PendingOperation[]>(OFFLINE_QUEUE_KEY, []));
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    Promise.all([movieDiaryApi.getAllMovies(), movieDiaryApi.getAllLists()])
      .then(([movies, lists]) => {
        setMovieLogs(reconcileMoviesWithPendingOperations(movies, queuedOperationsAtMount));
        setCustomLists(lists);
        setIsOffline(!navigator.onLine);
        clearOperationError();

        if (queuedOperationsAtMount.length > 0) {
          void replayPendingOperations(queuedOperationsAtMount);
        }
      })
      .catch((error: unknown) => {
        if (isOfflineLikeError(error)) {
          setIsOffline(true);
          return;
        }

        setErrorFromUnknown(error, 'Could not load data from the backend.');
      });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [replayPendingOperations, useBackend]);

  useEffect(() => {
    if (!useBackend) {
      return;
    }

    localStorage.setItem(MOVIES_CACHE_KEY, JSON.stringify(movieLogs));
    localStorage.setItem(LISTS_CACHE_KEY, JSON.stringify(customLists));
  }, [customLists, movieLogs, useBackend]);

  useEffect(() => {
    if (!useBackend) {
      return;
    }

    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pendingOperations));
  }, [pendingOperations, useBackend]);

  useEffect(() => {
    if (!useBackend || pendingOperations.length === 0) {
      return;
    }

    setMovieLogs((prev) => reconcileMoviesWithPendingOperations(prev, pendingOperations));
  }, [pendingOperations, useBackend]);

  const shouldQueueOperation = (error?: unknown) => {
    if (!useBackend) {
      return false;
    }

    if (!navigator.onLine || isOffline) {
      return true;
    }

    return error !== undefined && isOfflineLikeError(error);
  };

  const handleAddMovie = async (newMovie: MovieInput): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const createdMovie = await movieDiaryApi.createMovie(newMovie);
        setMovieLogs((prev) => [createdMovie, ...prev]);
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          const tempId = crypto.randomUUID();
          applyLocalAddMovie(newMovie, tempId);
          enqueueOperation({ type: 'createMovie', tempId, movie: newMovie });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not add movie.');
        return false;
      }
    }

    const tempId = crypto.randomUUID();
    applyLocalAddMovie(newMovie, tempId);
    if (useBackend) {
      enqueueOperation({ type: 'createMovie', tempId, movie: newMovie });
      setIsOffline(true);
    }
    return true;
  };

  const handleUpdateMovie = async (movieId: string, updatedMovieData: MovieInput): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const updatedMovie = await movieDiaryApi.updateMovie(movieId, updatedMovieData);
        setMovieLogs((prev) => prev.map((log) => (log.id === movieId ? updatedMovie : log)));
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalUpdateMovie(movieId, updatedMovieData);
          enqueueOperation({ type: 'updateMovie', movieId, movie: updatedMovieData });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not update movie.');
        return false;
      }
    }

    applyLocalUpdateMovie(movieId, updatedMovieData);
    if (useBackend) {
      enqueueOperation({ type: 'updateMovie', movieId, movie: updatedMovieData });
      setIsOffline(true);
    }
    return true;
  };

  const handleDeleteMovie = async (movieId: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteMovie(movieId);
        applyLocalDeleteMovie(movieId);
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalDeleteMovie(movieId);
          enqueueOperation({ type: 'deleteMovie', movieId });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not delete movie.');
        return false;
      }
    }

    applyLocalDeleteMovie(movieId);
    if (useBackend) {
      enqueueOperation({ type: 'deleteMovie', movieId });
      setIsOffline(true);
    }
    return true;
  };

  const handleCreateList = async (name: string, description: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const newList = await movieDiaryApi.createList(name, description);
        setCustomLists((prev) => [newList, ...prev]);
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          const tempId = crypto.randomUUID();
          applyLocalCreateList(name, description, tempId);
          enqueueOperation({ type: 'createList', tempId, name, description });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not create list.');
        return false;
      }
    }

    const tempId = crypto.randomUUID();
    applyLocalCreateList(name, description, tempId);
    if (useBackend) {
      enqueueOperation({ type: 'createList', tempId, name, description });
      setIsOffline(true);
    }
    return true;
  };

  const handleDeleteList = async (listId: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteList(listId);
        applyLocalDeleteList(listId);
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalDeleteList(listId);
          enqueueOperation({ type: 'deleteList', listId });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not delete list.');
        return false;
      }
    }

    applyLocalDeleteList(listId);
    if (useBackend) {
      enqueueOperation({ type: 'deleteList', listId });
      setIsOffline(true);
    }
    return true;
  };

  const handleAddMovieToList = async (listId: string, movieId: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const updatedList = await movieDiaryApi.addMovieToList(listId, movieId);
        setCustomLists((prev) => prev.map((list) => (list.id === listId ? updatedList : list)));
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalAddMovieToList(listId, movieId);
          enqueueOperation({ type: 'addMovieToList', listId, movieId });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not add movie to list.');
        return false;
      }
    }

    applyLocalAddMovieToList(listId, movieId);
    if (useBackend) {
      enqueueOperation({ type: 'addMovieToList', listId, movieId });
      setIsOffline(true);
    }
    return true;
  };

  const handleRemoveMovieFromList = async (listId: string, movieId: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const updatedList = await movieDiaryApi.removeMovieFromList(listId, movieId);
        setCustomLists((prev) => prev.map((list) => (list.id === listId ? updatedList : list)));
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalRemoveMovieFromList(listId, movieId);
          enqueueOperation({ type: 'removeMovieFromList', listId, movieId });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not remove movie from list.');
        return false;
      }
    }

    applyLocalRemoveMovieFromList(listId, movieId);
    if (useBackend) {
      enqueueOperation({ type: 'removeMovieFromList', listId, movieId });
      setIsOffline(true);
    }
    return true;
  };

  const handleAddFrameToMovie = async (movieId: string, frameData: Omit<SavedFrame, 'id'>): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        const createdFrame = await movieDiaryApi.addFrame(movieId, frameData);
        setMovieLogs((prev) =>
          prev.map((movie) => {
            if (movie.id !== movieId) {
              return movie;
            }

            return {
              ...movie,
              frames: [createdFrame, ...movie.frames],
            };
          }),
        );
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalAddFrame(movieId, frameData);
          enqueueOperation({ type: 'addFrame', movieId, frame: frameData });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not add frame.');
        return false;
      }
    }

    applyLocalAddFrame(movieId, frameData);
    if (useBackend) {
      enqueueOperation({ type: 'addFrame', movieId, frame: frameData });
      setIsOffline(true);
    }
    return true;
  };

  const handleDeleteFrameFromMovie = async (movieId: string, frameId: string): Promise<boolean> => {
    if (useBackend && !shouldQueueOperation()) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteFrame(movieId, frameId);
        applyLocalDeleteFrame(movieId, frameId);
        setIsOffline(false);
        return true;
      } catch (error: unknown) {
        if (shouldQueueOperation(error)) {
          applyLocalDeleteFrame(movieId, frameId);
          enqueueOperation({ type: 'deleteFrame', movieId, frameId });
          setIsOffline(true);
          return true;
        }

        setErrorFromUnknown(error, 'Could not delete frame.');
        return false;
      }
    }

    applyLocalDeleteFrame(movieId, frameId);
    if (useBackend) {
      enqueueOperation({ type: 'deleteFrame', movieId, frameId });
      setIsOffline(true);
    }
    return true;
  };

  return {
    movieLogs,
    customLists,
    isOffline,
    pendingSyncCount: pendingOperations.length,
    operationError,
    clearOperationError,
    syncPendingOperations,
    handleAddMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleCreateList,
    handleDeleteList,
    handleAddMovieToList,
    handleRemoveMovieFromList,
    handleAddFrameToMovie,
    handleDeleteFrameFromMovie,
  };
}

