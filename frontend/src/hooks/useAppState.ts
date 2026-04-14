import { useEffect, useState } from 'react';
import type { CustomList, MovieInput, MovieLog, SavedFrame } from '../types';
import { movieDiaryApi } from '../api/movieDiaryApi';

export function useAppState() {
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [operationError, setOperationError] = useState<string | null>(null);
  const useBackend = import.meta.env.MODE !== 'test';

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

  useEffect(() => {
    if (!useBackend) {
      return;
    }

    Promise.all([movieDiaryApi.getAllMovies(), movieDiaryApi.getAllLists()])
      .then(([movies, lists]) => {
        setMovieLogs(movies);
        setCustomLists(lists);
        clearOperationError();
      })
      .catch((error: unknown) => {
        setErrorFromUnknown(error, 'Could not load data from the backend.');
      });
  }, [useBackend]);

  const handleAddMovie = async (newMovie: MovieInput): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        const createdMovie = await movieDiaryApi.createMovie(newMovie);
        setMovieLogs((prev) => [createdMovie, ...prev]);
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not add movie.');
        return false;
      }
    }

    const movie: MovieLog = {
      ...newMovie,
      id: crypto.randomUUID(),
      frames: [],
    };

    setMovieLogs((prev) => [movie, ...prev]);
    return true;
  };

  const handleUpdateMovie = async (movieId: string, updatedMovieData: MovieInput): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        const updatedMovie = await movieDiaryApi.updateMovie(movieId, updatedMovieData);
        setMovieLogs((prev) => prev.map((log) => (log.id === movieId ? updatedMovie : log)));
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not update movie.');
        return false;
      }
    }

    setMovieLogs((prev) =>
      prev.map((log) => {
        if (log.id === movieId) {
          return { ...log, ...updatedMovieData };
        }
        return log;
      }),
    );
    return true;
  };

  const handleDeleteMovie = async (movieId: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteMovie(movieId);
        setMovieLogs((prev) => prev.filter((movie) => movie.id !== movieId));
        setCustomLists((prev) =>
          prev.map((list) => ({
            ...list,
            movieIds: list.movieIds.filter((id) => id !== movieId),
          })),
        );
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not delete movie.');
        return false;
      }
    }

    setMovieLogs((prev) => prev.filter((movie) => movie.id !== movieId));
    setCustomLists((prev) =>
      prev.map((list) => ({
        ...list,
        movieIds: list.movieIds.filter((id) => id !== movieId),
      })),
    );
    return true;
  };

  const handleCreateList = async (name: string, description: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        const newList = await movieDiaryApi.createList(name, description);
        setCustomLists((prev) => [newList, ...prev]);
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not create list.');
        return false;
      }
    }

    const newList: CustomList = {
      id: crypto.randomUUID(),
      name,
      description,
      movieIds: [],
    };

    setCustomLists((prev) => [newList, ...prev]);
    return true;
  };

  const handleDeleteList = async (listId: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteList(listId);
        setCustomLists((prev) => prev.filter((list) => list.id !== listId));
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not delete list.');
        return false;
      }
    }

    setCustomLists((prev) => prev.filter((list) => list.id !== listId));
    return true;
  };

  const handleAddMovieToList = async (listId: string, movieId: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        const updatedList = await movieDiaryApi.addMovieToList(listId, movieId);
        setCustomLists((prev) => prev.map((list) => (list.id === listId ? updatedList : list)));
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not add movie to list.');
        return false;
      }
    }

    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return { ...list, movieIds: [...list.movieIds, movieId] };
        }
        return list;
      }),
    );
    return true;
  };

  const handleRemoveMovieFromList = async (listId: string, movieId: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        const updatedList = await movieDiaryApi.removeMovieFromList(listId, movieId);
        setCustomLists((prev) => prev.map((list) => (list.id === listId ? updatedList : list)));
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not remove movie from list.');
        return false;
      }
    }

    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return { ...list, movieIds: list.movieIds.filter((id) => id !== movieId) };
        }
        return list;
      }),
    );
    return true;
  };

  const handleAddFrameToMovie = async (movieId: string, frameData: Omit<SavedFrame, 'id'>): Promise<boolean> => {
    if (useBackend) {
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
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not add frame.');
        return false;
      }
    }

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
    return true;
  };

  const handleDeleteFrameFromMovie = async (movieId: string, frameId: string): Promise<boolean> => {
    if (useBackend) {
      clearOperationError();
      try {
        await movieDiaryApi.deleteFrame(movieId, frameId);
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
        return true;
      } catch (error: unknown) {
        setErrorFromUnknown(error, 'Could not delete frame.');
        return false;
      }
    }

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
    return true;
  };

  return {
    movieLogs,
    customLists,
    operationError,
    clearOperationError,
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

