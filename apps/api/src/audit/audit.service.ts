import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    firmId: string,
    actorId: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    details?: Prisma.InputJsonValue
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          firmId,
          actorId,
          action,
          entityType,
          entityId,
          details: details || {},
        },
      });
    } catch (e) {
      console.error('Failed to write audit log', e);
    }
  }

  async getLogs(firmId: string, limit: number = 50, offset: number = 0) {
    return this.prisma.auditLog.findMany({
      where: { firmId },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getEntityLogs(firmId: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { firmId, entityType: entityType as any, entityId },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async exportLogs(firmId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { firmId },
      include: {
        actor: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['timestamp', 'actor', 'action', 'entityType', 'details'];
    const rows = logs.map((log: any) => [
      log.createdAt.toISOString(),
      log.actor?.email || '',
      log.action,
      log.entityType,
      JSON.stringify(log.details || {}),
    ]);

    const csvLines = [header.join(','), ...rows.map((row: string[]) => row.map((value: string) => `"${value.replace(/"/g, '""')}"`).join(','))];
    return { csv: csvLines.join('\n') };
  }
}
