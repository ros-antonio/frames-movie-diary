import { useState } from 'react';
import type { CustomList, MovieInput, MovieLog, SavedFrame } from '../types';

export function useAppState() {
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  const handleAddMovie = (newMovie: MovieInput) => {
    const movie: MovieLog = {
      ...newMovie,
      id: crypto.randomUUID(),
      frames: [],
    };

    setMovieLogs((prev) => [movie, ...prev]);
  };

  const handleUpdateMovie = (movieId: string, updatedMovieData: MovieInput) => {
    setMovieLogs((prev) =>
      prev.map((log) => {
        if (log.id === movieId) {
          return { ...log, ...updatedMovieData };
        }
        return log;
      }),
    );
  };

  const handleDeleteMovie = (movieId: string) => {
    setMovieLogs((prev) => prev.filter((movie) => movie.id !== movieId));
    setCustomLists((prev) =>
      prev.map((list) => ({
        ...list,
        movieIds: list.movieIds.filter((id) => id !== movieId),
      })),
    );
  };

  const handleCreateList = (name: string, description: string) => {
    const newList: CustomList = {
      id: crypto.randomUUID(),
      name,
      description,
      movieIds: [],
    };

    setCustomLists((prev) => [newList, ...prev]);
  };

  const handleDeleteList = (listId: string) => {
    setCustomLists((prev) => prev.filter((list) => list.id !== listId));
  };

  const handleAddMovieToList = (listId: string, movieId: string) => {
    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return { ...list, movieIds: [...list.movieIds, movieId] };
        }
        return list;
      }),
    );
  };

  const handleRemoveMovieFromList = (listId: string, movieId: string) => {
    setCustomLists((prev) =>
      prev.map((list) => {
        if (list.id === listId) {
          return { ...list, movieIds: list.movieIds.filter((id) => id !== movieId) };
        }
        return list;
      }),
    );
  };

  const handleAddFrameToMovie = (movieId: string, frameData: Omit<SavedFrame, 'id'>) => {
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
  };

  const handleDeleteFrameFromMovie = (movieId: string, frameId: string) => {
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
  };

  return {
    movieLogs,
    customLists,
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

