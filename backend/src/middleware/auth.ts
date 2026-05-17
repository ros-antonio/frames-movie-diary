import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { suspiciousActivityService } from '../services/suspiciousActivityService.js';
import { getRequestIp } from '../utils/requestMetadata.js';
import { getCookieToken, setAuthCookie, signAuthToken, type AuthTokenPayload, verifyToken } from '../utils/authSession.js';
import { prisma } from '../repositories/prismaClient.js';
import type { PermissionName } from '../utils/permissions.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        permissions: PermissionName[];
        sessionVersion: number;
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
    '/api/auth/mfa/verify',
    '/api/auth/password/forgot',
    '/api/auth/password/reset',
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

  void (async () => {
    try {
      const decoded = verifyToken<AuthTokenPayload>(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          sessionVersion: true,
        },
      });

      if (!user || user.sessionVersion !== decoded.sessionVersion) {
        throw new HttpError(401, 'Invalid or expired token');
      }

      req.user = {
        userId: user.id,
        role: decoded.role,
        permissions: [...decoded.permissions].sort(),
        sessionVersion: user.sessionVersion,
      };

      if (cookieToken && !authHeader?.startsWith('Bearer ')) {
        setAuthCookie(res, signAuthToken({
          userId: user.id,
          role: decoded.role,
          permissions: req.user.permissions,
          sessionVersion: user.sessionVersion,
        }));
      }

      next();
    } catch {
      next(new HttpError(401, 'Invalid or expired token'));
    }
  })();
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

export const authorizePermissions = (...requiredPermissions: PermissionName[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const grantedPermissions = req.user?.permissions ?? [];
    const allowed = requiredPermissions.every((permission) => grantedPermissions.includes(permission));

    if (!req.user || !allowed) {
      if (req.user) {
        await suspiciousActivityService.recordForbiddenAction({
          userId: req.user.userId,
          roleName: req.user.role,
          actionDetails: `Forbidden permission access attempt on ${req.method} ${req.originalUrl}`,
          ipAddress: getRequestIp(req),
        });
      }
      next(new HttpError(403, 'Forbidden: You do not have permission to perform this action'));
      return;
    }

    next();
  };
};
