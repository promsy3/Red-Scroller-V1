import { Controller, Get, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(ClerkAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService, private readonly prisma: PrismaService) {}

  private async requireAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'admin' || !user.firmId) {
      throw new ForbiddenException('Only admins can access audit logs');
    }
    return user as typeof user & { firmId: string };
  }

  @Get()
  async getLogs(@Request() req, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const user = await this.requireAdmin(req.user.sub);

    const take = limit ? parseInt(limit, 10) : 50;
    const skip = offset ? parseInt(offset, 10) : 0;

    return this.auditService.getLogs(user.firmId, take, skip);
  }

  @Get('entity')
  async getEntityLogs(@Request() req, @Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    const user = await this.requireAdmin(req.user.sub);

    if (!entityType || !entityId) {
      throw new ForbiddenException('entityType and entityId are required');
    }

    return this.auditService.getEntityLogs(user.firmId, entityType, entityId);
  }

  @Get('export')
  async exportLogs(@Request() req) {
    const user = await this.requireAdmin(req.user.sub);

    return this.auditService.exportLogs(user.firmId);
  }
}
