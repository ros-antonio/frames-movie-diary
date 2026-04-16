import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { setCookie } from '../utils/cookieManager';
import { getActivityLog, getPreferences, useUserActivity } from './useUserActivity';

function wrapperForPath(path: string) {
  return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
}

function clearCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/`;
}

describe('useUserActivity', () => {
  beforeEach(() => {
    clearCookie('frames_activity');
    clearCookie('frames_prefs');
    clearCookie('frames_session');
  });

  it('tracks movie actions with current route', () => {
    const { result } = renderHook(() => useUserActivity(), {
      wrapper: wrapperForPath('/diary'),
    });

    act(() => {
      result.current.trackMovieAction('movie-42', 'view');
    });

    const events = getActivityLog().activities;
    expect(events[events.length - 1]).toMatchObject({
      eventType: 'view',
      movieId: 'movie-42',
      pageRoute: '/diary',
    });
  });

  it('dedupes repeated page_visit events within the dedupe window', () => {
    const wrapper = wrapperForPath('/dedupe-page');
    const first = renderHook(() => useUserActivity({ trackPageVisits: true }), { wrapper });
    first.unmount();

    renderHook(() => useUserActivity({ trackPageVisits: true }), { wrapper });

    const pageVisits = getActivityLog().activities.filter(
      (event) => event.eventType === 'page_visit' && event.pageRoute === '/dedupe-page',
    );
    expect(pageVisits).toHaveLength(1);
  });

  it('falls back when activity cookie contains invalid JSON', () => {
    setCookie('frames_activity', '{invalid-json');

    const log = getActivityLog();

    expect(log.activities).toEqual([]);
    expect(log.sessionId).toContain('session_');
  });

  it('falls back when parsed activity payload is not an object', () => {
    setCookie('frames_activity', 'null');

    const log = getActivityLog();

    expect(log.activities).toEqual([]);
    expect(log.sessionId).toContain('session_');
  });

  it('returns default preferences when preference cookie is invalid JSON', () => {
    setCookie('frames_prefs', '{invalid-json');

    expect(getPreferences()).toEqual({
      viewMode: 'table',
      sortBy: 'none',
      sortOrder: 'none',
      itemsPerPage: 6,
    });
  });
});

