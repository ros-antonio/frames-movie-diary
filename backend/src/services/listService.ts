import type { CustomList } from '../types.js';
import { prisma } from '../repositories/prismaClient.js';
import { HttpError } from '../utils/httpError.js';

export interface ListInput {
  name: string;
  description: string;
}

class ListService {
  private toCustomList(list: {
    id: string;
    name: string;
    description: string;
    entries: Array<{ movieId: string }>;
  }): CustomList {
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      movieIds: list.entries.map((entry) => entry.movieId),
    };
  }

  async list(page: number, pageSize: number) {
    const totalItems = await prisma.customList.count();
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const skip = (clampedPage - 1) * pageSize;

    const lists = await prisma.customList.findMany({
      include: { entries: true },
      orderBy: { id: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      data: lists.map((list) => this.toCustomList(list)),
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

  async getById(listId: string): Promise<CustomList> {
    const list = await prisma.customList.findUnique({
      where: { id: listId },
      include: { entries: true },
    });

    if (!list) {
      throw new HttpError(404, 'List not found');
    }

    return this.toCustomList(list);
  }

  async create(input: ListInput): Promise<CustomList> {
    const list = await prisma.customList.create({
      data: {
        name: input.name,
        description: input.description,
      },
      include: { entries: true },
    });

    return this.toCustomList(list);
  }

  async update(listId: string, input: ListInput): Promise<CustomList> {
    try {
      const list = await prisma.customList.update({
        where: { id: listId },
        data: {
          name: input.name,
          description: input.description,
        },
        include: { entries: true },
      });

      return this.toCustomList(list);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        throw new HttpError(404, 'List not found');
      }

      throw error;
    }
  }

  async delete(listId: string): Promise<void> {
    try {
      await prisma.customList.delete({
        where: { id: listId },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        throw new HttpError(404, 'List not found');
      }

      throw error;
    }
  }

  async addMovie(listId: string, movieId: string): Promise<CustomList> {
    const listExists = await prisma.customList.count({ where: { id: listId } });
    if (listExists === 0) {
      throw new HttpError(404, 'List not found');
    }

    const movieExists = await prisma.movie.count({ where: { id: movieId } });
    if (movieExists === 0) {
      throw new HttpError(404, 'Movie not found');
    }

    try {
      await prisma.listMovie.create({
        data: {
          listId,
          movieId,
        },
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
        throw new HttpError(409, 'Movie already in list');
      }

      throw error;
    }

    return this.getById(listId);
  }

  async removeMovie(listId: string, movieId: string): Promise<CustomList> {
    const list = await this.getById(listId);

    if (!list.movieIds.includes(movieId)) {
      throw new HttpError(404, 'Movie not in list');
    }

    await prisma.listMovie.deleteMany({
      where: {
        listId,
        movieId,
      },
    });

    return this.getById(listId);
  }
}

export const listService = new ListService();

