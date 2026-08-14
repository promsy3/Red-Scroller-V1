import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, NotFoundException, ForbiddenException, Delete, Query } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Controller('matters')
@UseGuards(ClerkAuthGuard)
export class MattersController {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly audit: AuditService,
    private readonly emailService: EmailService
  ) {}

  private async requireFirm(userId: string, firmId?: string) {
    if (firmId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm to access matters');
      return user as typeof user & { firmId: string };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm to access matters');
    return user as typeof user & { firmId: string };
  }

  // Simple Levenshtein distance for fuzzy matching
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = Array(b.length + 1).fill(0).map(() => Array(a.length + 1).fill(0));
    
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // deletion
          matrix[j - 1][i] + 1,      // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    return matrix[b.length][a.length];
  }

  // Calculate similarity score (0-1, where 1 is identical)
  private calculateSimilarity(a: string, b: string): number {
    const lowerA = a.toLowerCase();
    const lowerB = b.toLowerCase();
    const distance = this.levenshteinDistance(lowerA, lowerB);
    const maxLength = Math.max(lowerA.length, lowerB.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  @Get()
  async getMatters(@Request() req) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const isAdmin = user.role === 'admin';

    const matters = await this.prisma.matter.findMany({
      where: {
        firmId: user.firmId,
        ...(isAdmin ? {} : {
          OR: [
            { isRestricted: false },
            { assignedTo: user.id },
            { matterAccess: { some: { userId: user.id } } }
          ]
        })
      },
      include: { 
        client: true, 
        assignee: {
          select: {
            id: true,
            email: true,
            clerkId: true,
            role: true,
            status: true
          }
        } 
      },
      orderBy: { updatedAt: 'desc' },
    });
    return matters;
  }

  @Get('similar')
  async checkSimilarMatters(@Request() req, @Query('title') title: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    if (!title || title.length < 2) return [];

    const matters = await this.prisma.matter.findMany({
      where: { firmId: user.firmId },
      select: { id: true, title: true },
    });

    const similar = matters
      .map(matter => ({
        ...matter,
        similarity: this.calculateSimilarity(title, matter.title)
      }))
      .filter(item => item.similarity >= 0.6) // 60% similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return similar;
  }

  @Post()
  async createMatter(
    @Request() req,
    @Body() body: { title: string; clientId: string; description?: string; assignedTo?: string; isRestricted?: boolean; type?: 'active' | 'pending' | 'closed' },
  ) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const client = await this.prisma.client.findFirst({ where: { id: body.clientId, firmId: user.firmId } });
    if (!client) throw new NotFoundException('Client not found');

    let assignedTo = user.id;
    if (body.assignedTo && body.assignedTo !== user.id) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: body.assignedTo, firmId: user.firmId, role: { in: ['admin', 'lawyer'] }, status: 'active' },
      });
      if (!assignee) throw new ForbiddenException('Assignee must be an active admin or lawyer in your Firm');
      assignedTo = body.assignedTo;
    }

    const matter = await this.prisma.matter.create({
      data: {
        firmId: user.firmId,
        clientId: body.clientId,
        title: body.title,
        description: body.description,
        status: body.type || 'pending',
        assignedTo,
        isRestricted: !!body.isRestricted,
      },
      include: { client: true, assignee: {
          select: {
            id: true,
            email: true,
            clerkId: true,
            role: true,
            status: true
          }
        } },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.CREATE, AuditEntityType.MATTER, matter.id, { title: matter.title });
    return matter;
  }

  @Get(':id')
  async getMatter(@Request() req, @Param('id') id: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const matter = await this.prisma.matter.findFirst({
      where: { id, firmId: user.firmId },
      include: { 
        client: true, 
        assignee: {
          select: {
            id: true,
            email: true,
            clerkId: true,
            role: true,
            status: true
          }
        },
        matterAccess: { include: { user: true } }, 
        documents: { include: { uploader: true }, orderBy: { createdAt: 'desc' } } 
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    if (matter.isRestricted && user.role !== 'admin' && matter.assignedTo !== user.id) {
      const hasAccess = matter.matterAccess.some(ma => ma.userId === user.id);
      if (!hasAccess) throw new ForbiddenException('Access denied to this restricted matter');
    }

    // Log if an admin is overriding to view a restricted matter they aren't assigned to
    if (matter.isRestricted && user.role === 'admin' && matter.assignedTo !== user.id) {
      const hasAccess = matter.matterAccess.some(ma => ma.userId === user.id);
      if (!hasAccess) {
        await this.audit.log(user.firmId, user.id, AuditAction.OVERRIDE, AuditEntityType.MATTER, matter.id, { reason: 'Admin view restricted matter' });
      }
    }

    return matter;
  }

  @Patch(':id')
  async updateMatter(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; status?: 'active' | 'pending' | 'closed'; assignedTo?: string; isRestricted?: boolean },
  ) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const matter = await this.getMatter(req, id); // Will run ethical walls check

    const updateData: any = { ...body };
    if (body.assignedTo) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: body.assignedTo, firmId: user.firmId, role: { in: ['admin', 'lawyer'] }, status: 'active' },
      });
      if (!assignee) throw new ForbiddenException('Assignee must be an active admin or lawyer in your Firm');
    }

    const updated = await this.prisma.matter.update({
      where: { id },
      data: updateData,
      include: { client: true, assignee: {
          select: {
            id: true,
            email: true,
            clerkId: true,
            role: true,
            status: true
          }
        } },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.MATTER, id, { fields_changed: Object.keys(body) });
    return updated;
  }

  @Post(':id/access')
  async addMatterAccess(@Request() req, @Param('id') id: string, @Body() body: { userId: string }) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const matter = await this.prisma.matter.findFirst({ 
      where: { id, firmId: user.firmId },
      include: { client: true }
    });
    if (!matter) throw new NotFoundException('Matter not found');

    if (user.role !== 'admin' && matter.assignedTo !== user.id) {
      throw new ForbiddenException('Only admins or the matter assignee can manage access');
    }

    const targetUser = await this.prisma.user.findUnique({ where: { id: body.userId } });
    if (!targetUser) throw new NotFoundException('User not found');

    const access = await this.prisma.matterAccess.create({
      data: { matterId: id, userId: body.userId },
    });

    // Notify the user that they've been granted access
    await this.emailService.sendMatterAccessGranted(
      targetUser.email,
      matter.title,
      matter.client.name
    );

    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.MATTER, id, { access_added: body.userId });
    return access;
  }

  @Delete(':id/access/:userId')
  async removeMatterAccess(@Request() req, @Param('id') id: string, @Param('userId') targetUserId: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const matter = await this.prisma.matter.findFirst({ where: { id, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    if (user.role !== 'admin' && matter.assignedTo !== user.id) {
      throw new ForbiddenException('Only admins or the matter assignee can manage access');
    }

    await this.prisma.matterAccess.deleteMany({
      where: { matterId: id, userId: targetUserId },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.MATTER, id, { access_removed: targetUserId });
    return { success: true };
  }
}
