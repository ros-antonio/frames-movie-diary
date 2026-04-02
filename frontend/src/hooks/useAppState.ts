import { useState } from 'react';
import type { CustomList, MovieInput, MovieLog } from '../types';

const RANDOM_WORDS = ['Neon', 'Midnight', 'Echo', 'Crimson', 'Silver', 'Parallel', 'Velvet', 'Quantum'];
const RANDOM_GENRES = ['Mystery', 'Drama', 'Thriller', 'Adventure', 'Noir', 'Sci-Fi', 'Comedy', 'Fantasy'];
const RATING_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function pickRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function getRandomWatchDate() {
  const now = Date.now();
  const daysBack = Math.floor(Math.random() * 730);
  const timestamp = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function useAppState() {
  const [movieLogs, setMovieLogs] = useState<MovieLog[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  const createMovieLog = (newMovie: MovieInput): MovieLog => ({
    ...newMovie,
    id: crypto.randomUUID(),
    frames: [],
  });

  const handleAddMovie = (newMovie: MovieInput) => {
    setMovieLogs((prev) => [createMovieLog(newMovie), ...prev]);
  };

  const handleAddRandomMovie = () => {
    const randomMovie: MovieInput = {
      movieName: `${pickRandomItem(RANDOM_WORDS)} ${pickRandomItem(RANDOM_GENRES)}`,
      watchDate: getRandomWatchDate(),
      rating: pickRandomItem(RATING_OPTIONS),
      review: 'Auto-generated entry for live statistics preview.',
    };

    setMovieLogs((prev) => [createMovieLog(randomMovie), ...prev]);
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

  return {
    movieLogs,
    customLists,
    handleAddMovie,
    handleAddRandomMovie,
    handleUpdateMovie,
    handleDeleteMovie,
    handleCreateList,
    handleDeleteList,
    handleAddMovieToList,
    handleRemoveMovieFromList,
  };
}

