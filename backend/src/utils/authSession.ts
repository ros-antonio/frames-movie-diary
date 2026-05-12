import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const authCookieName = 'frames_auth';
export const sessionIdleTimeoutMs = config.sessionIdleTimeoutMinutes * 60 * 1000;

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv !== 'test',
    sameSite: 'lax' as const,
    maxAge: sessionIdleTimeoutMs,
    path: '/',
  };
}

function buildClearCookieOptions() {
  return {
    httpOnly: true,
    secure: config.nodeEnv !== 'test',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function signAuthToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: `${config.sessionIdleTimeoutMinutes}m`,
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(authCookieName, token, buildCookieOptions());
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(authCookieName, buildClearCookieOptions());
}

export function getCookieToken(req: Request): string | null {
  return req.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${authCookieName}=`))
    ?.split('=')[1] ?? null;
}
