import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Auth middleware to extract user ID from request.
 * In a production app, this would verify JWT tokens.
 * For now, it extracts userId from X-User-Id header (used in tests and development).
 * Skips public endpoints (/api/health and /api/auth/*).
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const isPublicRoute = req.originalUrl === '/api/health' || req.originalUrl.startsWith('/api/auth');

  if (isPublicRoute) {
    return next();
  }

  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    throw new HttpError(401, 'User ID is required');
  }

  req.userId = userId;
  next();
}

