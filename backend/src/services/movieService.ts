import { randomUUID } from 'node:crypto';
import type { Movie, SavedFrame } from '../types.js';
import { store } from '../repositories/inMemoryStore.js';
import { HttpError } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';

export interface MovieInput {
  movieName: string;
  watchDate: string;
  rating?: number;
  review?: string;
  movieLink?: string;
}

export interface FrameInput {
  imageUrl: string;
  timestamp: string;
  caption: string;
}

class MovieService {
  list(page: number, pageSize: number) {
    const movies = Array.from(store.movies.values()).reverse();

    return paginate(movies, page, pageSize);
  }

  getById(movieId: string): Movie {
    const movie = store.movies.get(movieId);
    if (!movie) {
      throw new HttpError(404, 'Movie not found');
    }
    return movie;
  }

  create(input: MovieInput): Movie {
    const movie: Movie = {
      id: randomUUID(),
      ...input,
      frames: [],
    };

    store.movies.set(movie.id, movie);
    return movie;
  }

  update(movieId: string, input: MovieInput): Movie {
    const existing = this.getById(movieId);
    const updated: Movie = {
      ...existing,
      ...input,
    };

    store.movies.set(movieId, updated);
    return updated;
  }

  delete(movieId: string): void {
    this.getById(movieId);
    store.movies.delete(movieId);

    // Keep list relations valid when a movie disappears.
    for (const list of store.customLists.values()) {
      if (list.movieIds.includes(movieId)) {
        list.movieIds = list.movieIds.filter((id) => id !== movieId);
      }
    }
  }

  addFrame(movieId: string, frameInput: FrameInput): SavedFrame {
    const movie = this.getById(movieId);

    const frame: SavedFrame = {
      id: randomUUID(),
      ...frameInput,
    };

    movie.frames.unshift(frame);
    store.movies.set(movie.id, movie);
    return frame;
  }

  deleteFrame(movieId: string, frameId: string): void {
    const movie = this.getById(movieId);
    const frameExists = movie.frames.some((frame) => frame.id === frameId);

    if (!frameExists) {
      throw new HttpError(404, 'Frame not found');
    }

    movie.frames = movie.frames.filter((frame) => frame.id !== frameId);
    store.movies.set(movie.id, movie);
  }
}

export const movieService = new MovieService();

