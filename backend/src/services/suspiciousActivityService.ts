import { prisma } from '../repositories/prismaClient.js';
import { auditLogService } from './auditLogService.js';

const FAILED_LOGIN_THRESHOLD = 3;
const FORBIDDEN_ACTION_THRESHOLD = 3;
const DELETE_ACTIVITY_THRESHOLD = 4;
const WINDOW_MINUTES = 15;

function windowStart() {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

class SuspiciousActivityService {
  private async flagUser(userId: string, reason: string, score: number) {
    await prisma.suspiciousUser.upsert({
      where: {
        userId_reason: {
          userId,
          reason,
        },
      },
      update: {
        score,
        status: 'OBSERVED',
      },
      create: {
        userId,
        reason,
        score,
        status: 'OBSERVED',
      },
    });
  }

  async recordFailedLogin(email: string, ipAddress?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    await auditLogService.log({
      userId: user?.id,
      roleName: user?.role.name ?? 'ANONYMOUS',
      actionType: 'AUTH_LOGIN_FAILED',
      entityType: 'USER',
      entityId: user?.id,
      details: `Failed login for ${normalizedEmail}`,
      ipAddress,
    });

    if (!user) {
      return;
    }

    const recentFailures = await prisma.auditLog.count({
      where: {
        userId: user.id,
        actionType: 'AUTH_LOGIN_FAILED',
        createdAt: { gte: windowStart() },
      },
    });

    if (recentFailures >= FAILED_LOGIN_THRESHOLD) {
      await this.flagUser(user.id, 'REPEATED_FAILED_LOGINS', recentFailures);
    }
  }

  async recordForbiddenAction(input: {
    userId: string;
    roleName: string;
    actionDetails: string;
    ipAddress?: string;
  }) {
    await auditLogService.log({
      userId: input.userId,
      roleName: input.roleName,
      actionType: 'AUTH_FORBIDDEN',
      entityType: 'AUTHORIZATION',
      entityId: input.userId,
      details: input.actionDetails,
      ipAddress: input.ipAddress,
    });

    const recentForbidden = await prisma.auditLog.count({
      where: {
        userId: input.userId,
        actionType: 'AUTH_FORBIDDEN',
        createdAt: { gte: windowStart() },
      },
    });

    if (recentForbidden >= FORBIDDEN_ACTION_THRESHOLD) {
      await this.flagUser(input.userId, 'REPEATED_FORBIDDEN_ACTIONS', recentForbidden);
    }
  }

  async evaluateDeleteActivity(userId: string) {
    const recentDeletes = await prisma.auditLog.count({
      where: {
        userId,
        actionType: {
          in: ['MOVIE_DELETE', 'LIST_DELETE', 'FRAME_DELETE', 'ADMIN_DELETE_USER'],
        },
        createdAt: { gte: windowStart() },
      },
    });

    if (recentDeletes >= DELETE_ACTIVITY_THRESHOLD) {
      await this.flagUser(userId, 'HIGH_DELETE_ACTIVITY', recentDeletes);
    }
  }
}

export const suspiciousActivityService = new SuspiciousActivityService();
