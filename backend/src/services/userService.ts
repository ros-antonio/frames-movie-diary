import type { ChatUser, SuspiciousObservation } from '../types.js';
import { prisma } from '../repositories/prismaClient.js';
import { HttpError } from '../utils/httpError.js';

class UserService {
  private toIsoString(value: Date): string {
    return value.toISOString();
  }

  async listUsers() {
    const users = await prisma.user.findMany({
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        _count: {
          select: {
            movies: true,
            lists: true,
          },
        },
      },
      orderBy: [{ role: { name: 'asc' } }, { email: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((permission) => permission.name).sort(),
      movieCount: user._count.movies,
      listCount: user._count.lists,
    }));
  }

  async deleteUser(targetUserId: string, actingUserId: string) {
    if (targetUserId === actingUserId) {
      throw new HttpError(400, 'Admins cannot delete their own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, _count: { select: { movies: true, lists: true } } },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    return {
      deletedUserId: user.id,
      deletedUserEmail: user.email,
      deletedMovieCount: user._count.movies,
      deletedListCount: user._count.lists,
    };
  }

  async listSuspiciousUsers(): Promise<SuspiciousObservation[]> {
    const suspiciousUsers = await prisma.suspiciousUser.findMany({
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [
        { score: 'desc' },
        { lastDetectedAt: 'desc' },
      ],
    });

    return suspiciousUsers.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userName: entry.user.name,
      userEmail: entry.user.email,
      role: entry.user.role.name,
      reason: entry.reason,
      score: entry.score,
      status: entry.status,
      firstDetectedAt: this.toIsoString(entry.firstDetectedAt),
      lastDetectedAt: this.toIsoString(entry.lastDetectedAt),
      reviewedAt: entry.reviewedAt ? this.toIsoString(entry.reviewedAt) : undefined,
    }));
  }

  async listChatUsers(currentUserId: string): Promise<ChatUser[]> {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: currentUserId,
        },
      },
      include: {
        role: true,
      },
      orderBy: [{ role: { name: 'asc' } }, { name: 'asc' }, { email: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
    }));
  }

  async updateSuspiciousUserStatus(observationId: string, status: 'REVIEWED' | 'CLEARED', reviewedById: string) {
    const existing = await prisma.suspiciousUser.findUnique({
      where: { id: observationId },
    });

    if (!existing) {
      throw new HttpError(404, 'Suspicious observation not found');
    }

    const updated = await prisma.suspiciousUser.update({
      where: { id: observationId },
      data: {
        status,
        reviewedById,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      userEmail: updated.user.email,
      role: updated.user.role.name,
      reason: updated.reason,
      score: updated.score,
      status: updated.status,
      firstDetectedAt: this.toIsoString(updated.firstDetectedAt),
      lastDetectedAt: this.toIsoString(updated.lastDetectedAt),
      reviewedAt: updated.reviewedAt ? this.toIsoString(updated.reviewedAt) : undefined,
    } satisfies SuspiciousObservation;
  }
}

export const userService = new UserService();
