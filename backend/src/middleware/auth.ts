import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';
import { config } from '../config.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';
import { getCookieToken, setAuthCookie, signAuthToken } from '../utils/authSession.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * Authenticate middleware to verify JWT tokens.
 * Extracts the token from the Authorization header and attaches the user payload.
 * Skips public endpoints (/api/health and /api/auth/*).
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const publicRoutes = new Set([
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
  ]);
  const isPublicRoute = publicRoutes.has(req.path) || publicRoutes.has(req.originalUrl);

  if (isPublicRoute) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const cookieToken = getCookieToken(req);

  if (!authHeader?.startsWith('Bearer ') && !cookieToken) {
    throw new HttpError(401, 'Authentication required: Missing or invalid token');
  }

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : decodeURIComponent(cookieToken ?? '');

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string, role: string };

    req.user = decoded;
    if (cookieToken && !authHeader?.startsWith('Bearer ')) {
      setAuthCookie(res, signAuthToken({ userId: decoded.userId, role: decoded.role }));
    }
    next();
  } catch (error) {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

/**
 * Authorize middleware to restrict routes by user role.
 * Must be used AFTER the authenticate middleware.
 *
 * @example
 * router.delete('/users/:id', authenticate, authorize('ADMIN'), deleteUser);
 */
export const authorize = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      if (req.user) {
        await suspiciousActivityService.recordForbiddenAction({
          userId: req.user.userId,
          roleName: req.user.role,
          actionDetails: `Forbidden access attempt on ${req.method} ${req.originalUrl}`,
          ipAddress: getRequestIp(req),
        });
      }
      next(new HttpError(403, 'Forbidden: You do not have permission to perform this action'));
      return;
    }

    next();
  };
};
