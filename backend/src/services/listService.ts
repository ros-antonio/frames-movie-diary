import { randomUUID } from 'node:crypto';
import type { CustomList } from '../types.js';
import { store } from '../repositories/inMemoryStore.js';
import { HttpError } from '../utils/httpError.js';
import { paginate } from '../utils/pagination.js';

export interface ListInput {
  name: string;
  description: string;
}

class ListService {
  list(page: number, pageSize: number) {
    const lists = Array.from(store.customLists.values()).reverse();

    return paginate(lists, page, pageSize);
  }

  getById(listId: string): CustomList {
    const list = store.customLists.get(listId);
    if (!list) {
      throw new HttpError(404, 'List not found');
    }

    return list;
  }

  create(input: ListInput): CustomList {
    const list: CustomList = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      movieIds: [],
    };

    store.customLists.set(list.id, list);
    return list;
  }

  update(listId: string, input: ListInput): CustomList {
    const existing = this.getById(listId);
    const updated: CustomList = {
      ...existing,
      name: input.name,
      description: input.description,
    };

    store.customLists.set(listId, updated);
    return updated;
  }

  delete(listId: string): void {
    this.getById(listId);
    store.customLists.delete(listId);
  }

  addMovie(listId: string, movieId: string): CustomList {
    const list = this.getById(listId);

    if (!store.movies.has(movieId)) {
      throw new HttpError(404, 'Movie not found');
    }

    if (list.movieIds.includes(movieId)) {
      throw new HttpError(409, 'Movie already in list');
    }

    list.movieIds.push(movieId);
    store.customLists.set(list.id, list);
    return list;
  }

  removeMovie(listId: string, movieId: string): CustomList {
    const list = this.getById(listId);

    if (!list.movieIds.includes(movieId)) {
      throw new HttpError(404, 'Movie not in list');
    }

    list.movieIds = list.movieIds.filter((id) => id !== movieId);
    store.customLists.set(list.id, list);
    return list;
  }
}

export const listService = new ListService();

