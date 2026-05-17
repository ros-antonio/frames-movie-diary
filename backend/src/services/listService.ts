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

  private buildListAccessWhere(listId: string, userId: string, role: string) {
    return role === 'ADMIN' ? { id: listId } : { id: listId, userId };
  }

  async list(page: number, pageSize: number, userId: string, role: string) {
    const whereClause = role === 'ADMIN' ? {} : { userId };
    const totalItems = await prisma.customList.count({ where: whereClause });
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const clampedPage = Math.min(Math.max(page, 1), totalPages);
    const skip = (clampedPage - 1) * pageSize;

    const lists = await prisma.customList.findMany({
      where: whereClause,
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

  async getById(listId: string, userId: string, role: string): Promise<CustomList> {
    const list = await prisma.customList.findUnique({
      where: { id: listId },
      include: { entries: true },
    });

    if (!list || (role !== 'ADMIN' && list.userId !== userId)) {
      throw new HttpError(404, 'List not found');
    }

    return this.toCustomList(list);
  }

  async create(input: ListInput, userId: string): Promise<CustomList> {
    try {
      const list = await prisma.customList.create({
        data: {
          name: input.name,
          description: input.description,
          userId,
        },
        include: { entries: true },
      });

      return this.toCustomList(list);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2003') {
        throw new HttpError(400, 'Invalid user ID');
      }
      throw error;
    }
  }

  async update(listId: string, input: ListInput, userId: string, role: string): Promise<CustomList> {
    const list = await prisma.customList.findFirst({
      where: this.buildListAccessWhere(listId, userId, role),
      select: { id: true },
    });

    if (!list) {
      throw new HttpError(404, 'List not found');
    }

    try {
      const updated = await prisma.customList.update({
        where: { id: listId },
        data: {
          name: input.name,
          description: input.description,
        },
        include: { entries: true },
      });

      return this.toCustomList(updated);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2025') {
        throw new HttpError(404, 'List not found');
      }
      throw error;
    }
  }

  async delete(listId: string, userId: string, role: string): Promise<void> {
    const deleted = await prisma.customList.deleteMany({
      where: this.buildListAccessWhere(listId, userId, role),
    });

    if (deleted.count === 0) {
      throw new HttpError(404, 'List not found');
    }
  }

  async addMovie(listId: string, movieId: string, userId: string, role: string): Promise<CustomList> {
    const list = await prisma.customList.findFirst({
      where: this.buildListAccessWhere(listId, userId, role),
      select: { id: true },
    });

    if (!list) {
      throw new HttpError(404, 'List not found');
    }

    const movieWhere = role === 'ADMIN' ? { id: movieId } : { id: movieId, userId };
    const movieExists = await prisma.movie.count({ where: movieWhere });

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

    return this.getById(listId, userId, role);
  }

  async removeMovie(listId: string, movieId: string, userId: string, role: string): Promise<CustomList> {
    const list = await prisma.customList.findFirst({
      where: this.buildListAccessWhere(listId, userId, role),
      include: { entries: true },
    });

    if (!list) {
      throw new HttpError(404, 'List not found');
    }

    const currentList = this.toCustomList(list);

    if (!currentList.movieIds.includes(movieId)) {
      throw new HttpError(404, 'Movie not in list');
    }

    await prisma.listMovie.deleteMany({
      where: {
        listId,
        movieId,
      },
    });

    return {
      ...currentList,
      movieIds: currentList.movieIds.filter((existingMovieId) => existingMovieId !== movieId),
    };
  }
}

export const listService = new ListService();
