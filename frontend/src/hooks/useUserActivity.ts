import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { ActivityEvent, UserPreference, UserActivityLog } from '../types';
import { setCookie, getCookie } from '../utils/cookieManager';

const ACTIVITY_COOKIE = 'frames_activity';
const PREFERENCES_COOKIE = 'frames_prefs';
const SESSION_COOKIE = 'frames_session';
const MAX_ACTIVITY_COOKIE_CHARS = 3800;
const PAGE_VISIT_DEDUPE_MS = 800;

let lastTrackedPagePath: string | null = null;
let lastTrackedPageAt = 0;

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface UseUserActivityOptions {
  trackPageVisits?: boolean;
}

export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { trackPageVisits = false } = options;
  const location = useLocation();
  const sessionIdRef = useRef<string>(getCookie(SESSION_COOKIE) || generateSessionId());

  const logActivity = useCallback((event: Omit<ActivityEvent, 'timestamp'>) => {
    const activity: ActivityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const log = getActivityLog();
    const updatedActivities = [...log.activities, activity].slice(-50);

    saveActivityLog({
      ...log,
      activities: updatedActivities,
      lastActive: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    if (!getCookie(SESSION_COOKIE)) {
      setCookie(SESSION_COOKIE, sessionIdRef.current, { maxAge: 24 * 60 * 60 });
    }
  }, []);

  useEffect(() => {
    if (!trackPageVisits) {
      return;
    }

    const now = Date.now();
    if (lastTrackedPagePath === location.pathname && now - lastTrackedPageAt < PAGE_VISIT_DEDUPE_MS) {
      return;
    }

    lastTrackedPagePath = location.pathname;
    lastTrackedPageAt = now;

    logActivity({
      eventType: 'page_visit',
      pageRoute: location.pathname,
    });
  }, [location.pathname, trackPageVisits, logActivity]);

  const trackMovieAction = useCallback((movieId: string, action: 'view' | 'add' | 'edit' | 'delete') => {
    logActivity({
      eventType: action,
      movieId,
      pageRoute: location.pathname,
    });
  }, [location.pathname, logActivity]);

  const trackPreference = useCallback((preferences: Partial<UserPreference>) => {
    const currentPrefs = getPreferences();
    const updated = { ...currentPrefs, ...preferences };
    setCookie(PREFERENCES_COOKIE, JSON.stringify(updated), { maxAge: 365 * 24 * 60 * 60 });
    
    logActivity({
      eventType: 'preference_change',
      pageRoute: location.pathname,
      details: preferences,
    });
  }, [location.pathname, logActivity]);

  return { logActivity, trackMovieAction, trackPreference };
}

export function getActivityLog(): UserActivityLog {
  const stored = getCookie(ACTIVITY_COOKIE);
  const sessionId = getCookie(SESSION_COOKIE) || generateSessionId();

  if (stored) {
    try {
      return normalizeActivityLog(JSON.parse(stored), sessionId);
    } catch {
      return createEmptyLog(sessionId);
    }
  }
  return createEmptyLog(sessionId);
}

export function getPreferences(): UserPreference {
  const stored = getCookie(PREFERENCES_COOKIE);
  const defaults: UserPreference = {
    viewMode: 'table',
    sortBy: 'none',
    sortOrder: 'none',
    itemsPerPage: 6,
  };

  if (stored) {
    try {
      return { ...defaults, ...JSON.parse(stored) };
    } catch {
      return defaults;
    }
  }
  return defaults;
}

function saveActivityLog(log: UserActivityLog) {
  let activities = [...log.activities];
  let payload = JSON.stringify({ ...log, activities });

  // Keep cookie payload under safe limits by trimming oldest events.
  while (encodeURIComponent(payload).length > MAX_ACTIVITY_COOKIE_CHARS && activities.length > 0) {
    activities = activities.slice(1);
    payload = JSON.stringify({ ...log, activities });
  }

  if (encodeURIComponent(payload).length > MAX_ACTIVITY_COOKIE_CHARS) {
    payload = JSON.stringify({
      ...createEmptyLog(log.sessionId),
      lastActive: log.lastActive,
    });
  }

  setCookie(ACTIVITY_COOKIE, payload, { maxAge: 30 * 24 * 60 * 60 });
}


function createEmptyLog(sessionId: string): UserActivityLog {
  return {
    sessionId,
    preferences: {
      viewMode: 'table',
      sortBy: 'none',
      sortOrder: 'none',
      itemsPerPage: 6,
    },
    activities: [],
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeActivityLog(raw: unknown, fallbackSessionId: string): UserActivityLog {
  if (!raw || typeof raw !== 'object') {
    return createEmptyLog(fallbackSessionId);
  }

  const parsed = raw as Partial<UserActivityLog>;
  const safeLog = createEmptyLog(typeof parsed.sessionId === 'string' ? parsed.sessionId : fallbackSessionId);

  return {
    ...safeLog,
    activities: Array.isArray(parsed.activities) ? parsed.activities.slice(-50) : safeLog.activities,
    lastActive: typeof parsed.lastActive === 'string' ? parsed.lastActive : safeLog.lastActive,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : safeLog.createdAt,
  };
}

