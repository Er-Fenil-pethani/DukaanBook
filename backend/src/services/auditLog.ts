import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export async function writeAudit(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma;
  try {
    await client.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? Prisma.JsonNull,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (e) {
    logger.warn(`Failed to write audit log for ${entry.action}: ${(e as Error).message}`);
  }
}
