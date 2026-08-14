import { Controller, Get, Post, Body, UseGuards, Request, Param, ForbiddenException, NotFoundException, BadRequestException, Delete } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Controller('firms')
@UseGuards(ClerkAuthGuard)
export class FirmsController {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly audit?: AuditService,
    private readonly emailService?: EmailService
  ) {}

  private async requireFirm(userId: string, firmId?: string) {
    if (firmId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm');
      return user as typeof user & { firmId: string };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm');
    return user as typeof user & { firmId: string };
  }

  @Get()
  async getFirms() {
    return this.prisma.firm.findMany({
      select: { id: true, name: true, status: true },
    });
  }

  @Post()
  async createFirm(@Request() req, @Body() body: { name: string }) {
    const userId = req.user.sub;
    
    // Create the firm and update the user to be admin of this firm
    const firm = await this.prisma.firm.create({
      data: {
        name: body.name,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firmId: firm.id,
        role: 'admin',
        status: 'active',
      },
    });

    return firm;
  }

  @Post(':id/join')
  async joinFirm(@Request() req, @Param('id') firmId: string) {
    const userId = req.user.sub;

    const existingRequest = await this.prisma.firmJoinRequest.findFirst({
      where: { userId, status: 'pending' },
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending join request.');
    }

    const firm = await this.prisma.firm.findUnique({ where: { id: firmId } });
    if (!firm) {
      throw new NotFoundException('Firm not found');
    }

    const joinRequest = await this.prisma.firmJoinRequest.create({
      data: {
        userId,
        firmId,
      },
      include: { user: true },
    });

    // Notify all firm admins about the new join request
    const admins = await this.prisma.user.findMany({
      where: { firmId, role: 'admin', status: 'active' },
      select: { email: true, name: true },
    });

    for (const admin of admins) {
      await this.emailService?.sendJoinRequestNotification(
        admin.email,
        joinRequest.user.name || joinRequest.user.email,
        firm.name
      );
    }

    return joinRequest;
  }

  @Get('requests')
  async getJoinRequests(@Request() req) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only Firm admins can view join requests');
    }
    return this.prisma.firmJoinRequest.findMany({
      where: { firmId: user.firmId, status: 'pending' },
      include: { user: true },
    });
  }

  @Get('members')
  async getFirmMembers(@Request() req) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    return this.prisma.user.findMany({
      where: { firmId: user.firmId, status: 'active' },
      select: { id: true, email: true, role: true, status: true },
      orderBy: { email: 'asc' },
    });
  }

  @Delete(':id/members/:userId')
  async removeMember(@Request() req, @Param('id') firmId: string, @Param('userId') targetUserId: string) {
    const admin = await this.requireFirm(req.user.sub, req.user.firmId);
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Only Firm admins can remove members');
    }
    if (admin.firmId !== firmId) {
      throw new ForbiddenException('You can only remove members from your own firm');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, firmId },
    });

    if (!targetUser) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        firmId: null,
        status: 'removed',
        removedAt: new Date(),
      },
    });

    await this.prisma.matterAccess.deleteMany({ where: { userId: targetUserId } });

    if (this.audit) {
      await this.audit.log(admin.firmId, admin.id, AuditAction.DELETE, AuditEntityType.USER, targetUserId, {
        removed_user: targetUserId,
        removed_by: admin.id,
      });
    }

    return { message: 'Member removed' };
  }

  @Post('requests/:id/approve')
  async approveRequest(@Request() req, @Param('id') requestId: string, @Body() body: { role?: 'lawyer' | 'paralegal' } = {}) {
    const admin = await this.requireFirm(req.user.sub, req.user.firmId);
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Only Firm admins can approve join requests');
    }

    const joinRequest = await this.prisma.firmJoinRequest.findUnique({
      where: { id: requestId },
      include: { user: true, firm: true },
    });

    if (!joinRequest || joinRequest.firmId !== admin.firmId) {
      throw new NotFoundException('Join request not found');
    }

    if (joinRequest.status !== 'pending') {
      throw new BadRequestException('Join request is not pending');
    }

    const requestedRole = body.role === 'paralegal' ? 'paralegal' : 'lawyer';

    await this.prisma.firmJoinRequest.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });

    await this.prisma.user.update({
      where: { id: joinRequest.userId },
      data: {
        firmId: admin.firmId,
        role: requestedRole,
        status: 'active',
      },
    });

    // Notify the user that their request was approved
    await this.emailService?.sendJoinRequestApproved(
      joinRequest.user.email,
      joinRequest.firm.name
    );

    return { message: 'Request approved' };
  }

  @Post('requests/:id/decline')
  async declineRequest(@Request() req, @Param('id') requestId: string) {
    const admin = await this.requireFirm(req.user.sub, req.user.firmId);
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Only Firm admins can decline join requests');
    }

    const joinRequest = await this.prisma.firmJoinRequest.findUnique({
      where: { id: requestId },
      include: { user: true, firm: true },
    });

    if (!joinRequest || joinRequest.firmId !== admin.firmId) {
      throw new NotFoundException('Join request not found');
    }

    if (joinRequest.status !== 'pending') {
      throw new BadRequestException('Join request is not pending');
    }

    await this.prisma.firmJoinRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    // Notify the user that their request was declined
    await this.emailService?.sendJoinRequestDeclined(
      joinRequest.user.email,
      joinRequest.firm.name
    );

    return { message: 'Request declined' };
  }

  @Post('invites')
  async createInvite(@Request() req, @Body() body: { maxUses?: number; expiresInDays?: number } = {}) {
    const admin = await this.requireFirm(req.user.sub, req.user.firmId);
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Only Firm admins can create invite links');
    }

    const token = this.generateInviteToken();
    const expiresInDays = body.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await this.prisma.firmInvite.create({
      data: {
        firmId: admin.firmId,
        token,
        createdBy: admin.id,
        expiresAt,
        maxUses: body.maxUses,
      },
    });

    // Generate the invite URL
    const inviteUrl = `${process.env.CLERK_AUTHORIZED_PARTY || 'http://localhost:3000'}/onboarding/join?token=${token}`;

    return { inviteUrl, token: invite.token, expiresAt: invite.expiresAt, maxUses: invite.maxUses };
  }

  @Get('invites/:token')
  async validateInvite(@Param('token') token: string) {
    const invite = await this.prisma.firmInvite.findUnique({
      where: { token },
      include: { firm: true },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite link');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('Invite link has expired');
    }

    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      throw new BadRequestException('Invite link has reached maximum uses');
    }

    return { 
      firmId: invite.firmId, 
      firmName: invite.firm.name,
      valid: true 
    };
  }

  @Post('invites/:token/use')
  async useInvite(@Param('token') token: string) {
    const invite = await this.prisma.firmInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite link');
    }

    if (invite.maxUses && invite.useCount >= invite.maxUses) {
      throw new BadRequestException('Invite link has reached maximum uses');
    }

    await this.prisma.firmInvite.update({
      where: { token },
      data: { useCount: { increment: 1 } },
    });

    return { success: true };
  }

  private generateInviteToken(): string {
    // Generate a secure random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}
