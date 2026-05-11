import { prisma } from '../repositories/prismaClient.js';

interface AuditLogInput {
  userId?: string | null;
  roleName: string;
  actionType: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

class AuditLogService {
  async log(input: AuditLogInput) {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        roleName: input.roleName,
        actionType: input.actionType,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
        ipAddress: input.ipAddress,
      },
    });
  }
}

export const auditLogService = new AuditLogService();
