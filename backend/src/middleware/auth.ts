import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';
import { extractAuthTokenFromHeaders, verifyAuthToken } from '../utils/authToken.js';

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
  const isPublicRoute = req.originalUrl === '/api/health' || req.originalUrl.startsWith('/api/auth');

  if (isPublicRoute) {
    return next();
  }

  const token = extractAuthTokenFromHeaders(req.headers);

  if (!token) {
    throw new HttpError(401, 'Authentication required: Missing or invalid token');
  }

  try {
    const decoded = verifyAuthToken(token);

    req.user = decoded;
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
