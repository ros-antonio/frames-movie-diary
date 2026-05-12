import type { AuthUser } from '../types';

const MOVIES_CACHE_KEY = 'movie-diary.movies-cache.v1';
const LISTS_CACHE_KEY = 'movie-diary.lists-cache.v1';
const OFFLINE_QUEUE_KEY = 'movie-diary.offline-queue.v1';

const USER_ID_KEY = 'userId';
const USER_ROLE_KEY = 'userRole';
const USER_NAME_KEY = 'userName';
const USER_EMAIL_KEY = 'userEmail';
const LAST_ACTIVITY_AT_KEY = 'sessionLastActivityAt';
const DEFAULT_IDLE_TIMEOUT_MINUTES = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MINUTES ?? 15);

export const SESSION_IDLE_TIMEOUT_MS = DEFAULT_IDLE_TIMEOUT_MINUTES * 60 * 1000;

export interface StoredSessionUser {
  id: string;
  role: string;
  name?: string;
  email?: string;
}

export function persistSessionUser(user: AuthUser) {
  localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem(USER_ROLE_KEY, user.role);
  localStorage.setItem(USER_NAME_KEY, user.name);
  localStorage.setItem(USER_EMAIL_KEY, user.email);
  updateSessionActivity();
}

export function persistTestSessionUser(user: StoredSessionUser) {
  localStorage.setItem(USER_ID_KEY, user.id);
  localStorage.setItem(USER_ROLE_KEY, user.role);

  if (user.name) {
    localStorage.setItem(USER_NAME_KEY, user.name);
  }

  if (user.email) {
    localStorage.setItem(USER_EMAIL_KEY, user.email);
  }

  updateSessionActivity();
}

export function clearSessionUser() {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(LAST_ACTIVITY_AT_KEY);

  localStorage.removeItem(MOVIES_CACHE_KEY);
  localStorage.removeItem(LISTS_CACHE_KEY);
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export function updateSessionActivity(timestamp = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(timestamp));
}

export function readLastSessionActivity(): number | null {
  const rawValue = localStorage.getItem(LAST_ACTIVITY_AT_KEY);
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasSessionTimedOut(now = Date.now(), timeoutMs = SESSION_IDLE_TIMEOUT_MS): boolean {
  const lastActivityAt = readLastSessionActivity();

  if (lastActivityAt === null) {
    return false;
  }

  return now - lastActivityAt >= timeoutMs;
}

export function readSessionUser(): StoredSessionUser | null {
  const id = localStorage.getItem(USER_ID_KEY);
  const role = localStorage.getItem(USER_ROLE_KEY);

  if (!id || !role) {
    return null;
  }

  return {
    id,
    role,
    name: localStorage.getItem(USER_NAME_KEY) ?? undefined,
    email: localStorage.getItem(USER_EMAIL_KEY) ?? undefined,
  };
}

export function dispatchSessionChanged(userId: string | null) {
  window.dispatchEvent(new CustomEvent('userIdChanged', { detail: { userId } }));
}
