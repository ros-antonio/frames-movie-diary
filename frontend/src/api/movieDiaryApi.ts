import type {
  AdminUser,
  AuthSuccessResponse,
  AuthUser,
  CustomList,
  ListOverlapStatistic,
  LoginResult,
  MovieInput,
  MovieLog,
  SavedFrame,
  SecurityState,
  StatisticsOverview,
  SuspiciousObservation,
} from '../types';

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

export type AuthResponse = AuthSuccessResponse;

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
  getMoviesPage(page: number, pageSize?: number): Promise<PaginatedResponse<MovieLog>>;
  getMovie(movieId: string): Promise<MovieLog>;
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
  register(input: { name: string; email: string; password: string; confirmPassword: string }): Promise<AuthResponse>;
  login(input: { email: string; password: string }): Promise<LoginResult>;
  verifyMfa(input: { challengeToken: string; code: string; method: 'totp' | 'recovery_code' }): Promise<AuthSuccessResponse>;
  getSessionUser(): Promise<AuthUser>;
  getSecurityState(): Promise<SecurityState>;
  beginMfaSetup(): Promise<{ secret: string; otpAuthUri: string }>;
  enableMfa(input: { code: string }): Promise<{ recoveryCodes: string[] }>;
  regenerateRecoveryCodes(input: { code: string }): Promise<{ recoveryCodes: string[] }>;
  disableMfa(input: { password: string }): Promise<void>;
  forgotPassword(input: { email: string }): Promise<{ message: string; resetToken?: string; expiresAt?: string }>;
  resetPassword(input: { token: string; password: string; confirmPassword: string }): Promise<void>;
  logout(): Promise<void>;
  getStatisticsOverview(): Promise<StatisticsOverview>;
  getListOverlapStatistics(): Promise<ListOverlapStatistic[]>;
  getUsers(): Promise<AdminUser[]>;
  getSuspiciousUsers(): Promise<SuspiciousObservation[]>;
  markSuspiciousUserReviewed(observationId: string): Promise<SuspiciousObservation>;
  clearSuspiciousUser(observationId: string): Promise<SuspiciousObservation>;
  deleteUser(userId: string): Promise<void>;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';
const AUTH_EXPIRED_EVENT = 'authExpired';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> ?? {}),
    };

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
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
      const body = (await response.json()) as {
        message?: string;
        details?: Array<{ message?: string }>;
      };
      if (body.message) {
        message = body.message;
      }

      const firstDetail = body.details?.[0]?.message;
      if (firstDetail && body.message) {
        message = `${body.message}: ${firstDetail}`;
      }
    } catch { /* empty */ }

    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
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
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function loginUser(input: { email: string; password: string }) {
  return request<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function verifyMfa(input: { challengeToken: string; code: string; method: 'totp' | 'recovery_code' }) {
  return request<AuthSuccessResponse>('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSessionUser() {
  const payload = await request<{ user: AuthUser }>('/auth/session');
  return payload.user;
}

export function getSecurityState() {
  return request<SecurityState>('/auth/security');
}

export function beginMfaSetup() {
  return request<{ secret: string; otpAuthUri: string }>('/auth/mfa/setup', {
    method: 'POST',
  });
}

export function enableMfa(input: { code: string }) {
  return request<{ recoveryCodes: string[] }>('/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function regenerateRecoveryCodes(input: { code: string }) {
  return request<{ recoveryCodes: string[] }>('/auth/mfa/recovery-codes/regenerate', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function disableMfa(input: { password: string }) {
  return request<void>('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function forgotPassword(input: { email: string }) {
  return request<{ message: string; resetToken?: string; expiresAt?: string }>('/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resetPassword(input: { token: string; password: string; confirmPassword: string }) {
  return request<void>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logoutUser() {
  return request<void>('/auth/logout', {
    method: 'POST',
  });
}

export const movieDiaryApi: MovieDiaryApi = {
  getMoviesPage(page: number, pageSize = 12) {
    return request<PaginatedResponse<MovieLog>>(`/movies?page=${page}&pageSize=${pageSize}`);
  },

  getAllMovies() {
    return getAllPages<MovieLog>('/movies');
  },

  getMovie(movieId: string) {
    return request<MovieLog>(`/movies/${movieId}`);
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

  verifyMfa(input: { challengeToken: string; code: string; method: 'totp' | 'recovery_code' }) {
    return verifyMfa(input);
  },

  getSessionUser() {
    return getSessionUser();
  },

  getSecurityState() {
    return getSecurityState();
  },

  beginMfaSetup() {
    return beginMfaSetup();
  },

  enableMfa(input: { code: string }) {
    return enableMfa(input);
  },

  regenerateRecoveryCodes(input: { code: string }) {
    return regenerateRecoveryCodes(input);
  },

  disableMfa(input: { password: string }) {
    return disableMfa(input);
  },

  forgotPassword(input: { email: string }) {
    return forgotPassword(input);
  },

  resetPassword(input: { token: string; password: string; confirmPassword: string }) {
    return resetPassword(input);
  },

  logout() {
    return logoutUser();
  },

  getStatisticsOverview() {
    return request<StatisticsOverview>('/statistics/overview');
  },

  getListOverlapStatistics() {
    return request<ListOverlapStatistic[]>('/statistics/list-overlaps');
  },

  getUsers() {
    return request<AdminUser[]>('/users');
  },

  getSuspiciousUsers() {
    return request<SuspiciousObservation[]>('/users/suspicious');
  },

  markSuspiciousUserReviewed(observationId: string) {
    return request<SuspiciousObservation>(`/users/suspicious/${observationId}/review`, {
      method: 'POST',
    });
  },

  clearSuspiciousUser(observationId: string) {
    return request<SuspiciousObservation>(`/users/suspicious/${observationId}/clear`, {
      method: 'POST',
    });
  },

  deleteUser(userId: string) {
    return request<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};
