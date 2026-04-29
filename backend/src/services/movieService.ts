import type { Movie, SavedFrame } from '../types.js';
import { prisma } from '../repositories/prismaClient.js';
import { HttpError } from '../utils/httpError.js';

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
  private toDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toSavedFrame(frame: { id: string; imageUrl: string; timestamp: string; caption: string }): SavedFrame {
    return {
      id: frame.id,
      imageUrl: frame.imageUrl,
      timestamp: frame.timestamp,
      caption: frame.caption,
    };
  }

  private toMovie(movie: {
    id: string;
    movieName: string;
    watchDate: Date;
    rating: number | null;
    review: string | null;
    movieLink: string | null;
    frames: Array<{ id: string; imageUrl: string; timestamp: string; caption: string }>;
  }): Movie {
    return {
      id: movie.id,
      movieName: movie.movieName,
      watchDate: this.toDateOnly(movie.watchDate),
      rating: movie.rating ?? undefined,
      review: movie.review ?? undefined,
      movieLink: movie.movieLink ?? undefined,
      frames: movie.frames.map((frame) => this.toSavedFrame(frame)),
    };
  }

  async list(page: number, pageSize: number) {
    const totalItems = await prisma.movie.count();
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const skip = (clampedPage - 1) * pageSize;

    const movies = await prisma.movie.findMany({
      include: { frames: true },
      orderBy: [{ watchDate: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
    });

    return {
      data: movies.map((movie) => this.toMovie(movie)),
      pagination: {
        page: clampedPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: clampedPage < totalPages,
        hasPreviousPage: clampedPage > 1,
      },
    };
  }

  async getById(movieId: string): Promise<Movie> {
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: { frames: true },
    });

    if (!movie) {
      throw new HttpError(404, 'Movie not found');
    }

    return this.toMovie(movie);
  }

  async create(input: MovieInput): Promise<Movie> {
    const movie = await prisma.movie.create({
      data: {
        movieName: input.movieName,
        watchDate: this.parseDateOnly(input.watchDate),
        rating: input.rating,
        review: input.review,
        movieLink: input.movieLink,
      },
      include: { frames: true },
    });

    return this.toMovie(movie);
  }

  async update(movieId: string, input: MovieInput): Promise<Movie> {
    try {
      const movie = await prisma.movie.update({
        where: { id: movieId },
        data: {
          movieName: input.movieName,
          watchDate: this.parseDateOnly(input.watchDate),
          rating: input.rating,
          review: input.review,
          movieLink: input.movieLink,
        },
        include: { frames: true },
      });

      return this.toMovie(movie);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        throw new HttpError(404, 'Movie not found');
      }

      throw error;
    }
  }

  async delete(movieId: string): Promise<void> {
    try {
      await prisma.movie.delete({ where: { id: movieId } });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        throw new HttpError(404, 'Movie not found');
      }

      throw error;
    }
  }

  async addFrame(movieId: string, frameInput: FrameInput): Promise<SavedFrame> {
    try {
      const frame = await prisma.frame.create({
        data: {
          imageUrl: frameInput.imageUrl,
          timestamp: frameInput.timestamp,
          caption: frameInput.caption,
          movieId,
        },
      });

      return this.toSavedFrame(frame);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2003') {
        throw new HttpError(404, 'Movie not found');
      }

      throw error;
    }
  }

  async deleteFrame(movieId: string, frameId: string): Promise<void> {
    const deleted = await prisma.frame.deleteMany({
      where: {
        id: frameId,
        movieId,
      },
    });

    if (deleted.count === 0) {
      throw new HttpError(404, 'Frame not found');
    }
  }
}

export const movieService = new MovieService();

