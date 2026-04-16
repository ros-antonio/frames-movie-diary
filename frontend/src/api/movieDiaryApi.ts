import type { AuthUser, CustomList, MovieInput, MovieLog, SavedFrame, StatisticsOverview } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class ApiHttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiHttpError';
  }
}

export class ApiNetworkError extends Error {
  constructor(message = 'Network is unavailable') {
    super(message);
    this.name = 'ApiNetworkError';
  }
}

export function isOfflineLikeError(error: unknown): boolean {
  if (error instanceof ApiNetworkError) {
    return true;
  }

  if (error instanceof TypeError) {
    return /fetch|network|failed to fetch/i.test(error.message);
  }

  if (error instanceof Error) {
    return /network|offline|failed to fetch|load data from the backend/i.test(error.message);
  }

  return false;
}

export interface MovieDiaryApi {
  getAllMovies(): Promise<MovieLog[]>;
  createMovie(movie: MovieInput): Promise<MovieLog>;
  updateMovie(movieId: string, movie: MovieInput): Promise<MovieLog>;
  deleteMovie(movieId: string): Promise<void>;
  addFrame(movieId: string, frame: Omit<SavedFrame, 'id'>): Promise<SavedFrame>;
  deleteFrame(movieId: string, frameId: string): Promise<void>;
  getAllLists(): Promise<CustomList[]>;
  createList(name: string, description: string): Promise<CustomList>;
  deleteList(listId: string): Promise<void>;
  addMovieToList(listId: string, movieId: string): Promise<CustomList>;
  removeMovieFromList(listId: string, movieId: string): Promise<CustomList>;
  register(input: { name: string; email: string; password: string; confirmPassword: string }): Promise<AuthUser>;
  login(input: { email: string; password: string }): Promise<AuthUser>;
  getStatisticsOverview(): Promise<StatisticsOverview>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new ApiNetworkError(error.message);
    }

    throw new ApiNetworkError();
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep fallback message if response body is not JSON.
    }

    throw new ApiHttpError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function getAllPages<T>(path: string): Promise<T[]> {
  const pageSize = 100;
  let page = 1;
  const aggregated: T[] = [];

  while (true) {
    const payload = await request<PaginatedResponse<T>>(`${path}?page=${page}&pageSize=${pageSize}`);
    aggregated.push(...payload.data);

    if (!payload.pagination.hasNextPage) {
      return aggregated;
    }

    page += 1;
  }
}

export function registerUser(input: { name: string; email: string; password: string; confirmPassword: string }) {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function loginUser(input: { email: string; password: string }) {
  return request<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export const movieDiaryApi: MovieDiaryApi = {
  getAllMovies() {
    return getAllPages<MovieLog>('/movies');
  },

  createMovie(movie: MovieInput) {
    return request<MovieLog>('/movies', {
      method: 'POST',
      body: JSON.stringify(movie),
    });
  },

  updateMovie(movieId: string, movie: MovieInput) {
    return request<MovieLog>(`/movies/${movieId}`, {
      method: 'PUT',
      body: JSON.stringify(movie),
    });
  },

  deleteMovie(movieId: string) {
    return request<void>(`/movies/${movieId}`, {
      method: 'DELETE',
    });
  },

  addFrame(movieId: string, frame: Omit<SavedFrame, 'id'>) {
    return request<SavedFrame>(`/movies/${movieId}/frames`, {
      method: 'POST',
      body: JSON.stringify(frame),
    });
  },

  deleteFrame(movieId: string, frameId: string) {
    return request<void>(`/movies/${movieId}/frames/${frameId}`, {
      method: 'DELETE',
    });
  },

  getAllLists() {
    return getAllPages<CustomList>('/lists');
  },

  createList(name: string, description: string) {
    return request<CustomList>('/lists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  },

  deleteList(listId: string) {
    return request<void>(`/lists/${listId}`, {
      method: 'DELETE',
    });
  },

  addMovieToList(listId: string, movieId: string) {
    return request<CustomList>(`/lists/${listId}/movies/${movieId}`, {
      method: 'POST',
    });
  },

  removeMovieFromList(listId: string, movieId: string) {
    return request<CustomList>(`/lists/${listId}/movies/${movieId}`, {
      method: 'DELETE',
    });
  },

  register(input: { name: string; email: string; password: string; confirmPassword: string }) {
    return registerUser(input);
  },

  login(input: { email: string; password: string }) {
    return loginUser(input);
  },

  getStatisticsOverview() {
    return request<StatisticsOverview>('/statistics/overview');
  },
};

