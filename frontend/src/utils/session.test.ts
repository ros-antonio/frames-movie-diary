import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSessionUser,
  dispatchSessionChanged,
  persistSessionUser,
  persistTestSessionUser,
  readSessionUser,
} from './session';

describe('session utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and reads a full authenticated user session', () => {
    persistSessionUser({
      id: 'user-1',
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'ADMIN',
    });

    expect(readSessionUser()).toEqual({
      id: 'user-1',
      name: 'Tony Stark',
      email: 'tony@example.com',
      role: 'ADMIN',
    });
  });

  it('persists test sessions even when only partial metadata is available', () => {
    persistTestSessionUser({
      id: 'user-2',
      role: 'USER',
      email: 'user@example.com',
    });

    expect(readSessionUser()).toEqual({
      id: 'user-2',
      role: 'USER',
      email: 'user@example.com',
      name: undefined,
    });
  });

  it('clears the session and offline cache keys', () => {
    localStorage.setItem('userId', 'user-1');
    localStorage.setItem('userRole', 'ADMIN');
    localStorage.setItem('userName', 'Tony Stark');
    localStorage.setItem('userEmail', 'tony@example.com');
    localStorage.setItem('movie-diary.movies-cache.v1', '[]');
    localStorage.setItem('movie-diary.lists-cache.v1', '[]');
    localStorage.setItem('movie-diary.offline-queue.v1', '[]');

    clearSessionUser();

    expect(readSessionUser()).toBeNull();
    expect(localStorage.getItem('movie-diary.movies-cache.v1')).toBeNull();
    expect(localStorage.getItem('movie-diary.lists-cache.v1')).toBeNull();
    expect(localStorage.getItem('movie-diary.offline-queue.v1')).toBeNull();
  });

  it('dispatches the userIdChanged event with the supplied user id', () => {
    const listener = vi.fn();
    window.addEventListener('userIdChanged', listener);

    dispatchSessionChanged('user-3');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent<{ userId: string | null }>;
    expect(event.detail).toEqual({ userId: 'user-3' });

    window.removeEventListener('userIdChanged', listener);
  });
});
