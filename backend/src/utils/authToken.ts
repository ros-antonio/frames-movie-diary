import jwt from 'jsonwebtoken';
import type { IncomingHttpHeaders } from 'node:http';
import { config } from '../config.js';

export interface AuthTokenPayload {
  userId: string;
  role: string;
}

function readCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`));

  return cookie ? decodeURIComponent(cookie.split('=')[1] ?? '') : null;
}

export function extractAuthTokenFromHeaders(headers: IncomingHttpHeaders): string | null {
  const authHeader = headers.authorization;

  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1] ?? null;
  }

  return readCookieValue(typeof headers.cookie === 'string' ? headers.cookie : undefined, 'frames_auth');
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
