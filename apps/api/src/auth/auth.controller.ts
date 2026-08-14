import { Controller, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getMe(@Request() req) {
    // User is guaranteed to exist after passing ClerkAuthGuard
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { firm: true, joinRequests: { where: { status: 'pending' } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const activity = user.firmId ? await this.audit.getLogs(user.firmId, 5, 0) : [];

    return {
      ...user,
      recentActivity: activity,
    };
  }
}
