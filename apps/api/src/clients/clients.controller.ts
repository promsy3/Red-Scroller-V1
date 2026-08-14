import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, NotFoundException, ForbiddenException, Query } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '@prisma/client';

@Controller('clients')
@UseGuards(ClerkAuthGuard)
export class ClientsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async requireFirm(userId: string, firmId?: string) {
    if (firmId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm to access clients');
      return user as typeof user & { firmId: string };
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm to access clients');
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
  async getClients(
    @Request() req,
    @Query('search') search?: string,
    @Query('type') type?: 'corporate' | 'individual',
    @Query('verificationStatus') verificationStatus?: 'pending' | 'verified' | 'rejected',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    
    const pageNum = Math.max(1, parseInt(page || '1'));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20')));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { firmId: user.firmId };
    
    if (search && search.length >= 2) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    if (type) {
      where.type = type;
    }
    
    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      this.prisma.client.count({ where })
    ]);

    return {
      data: clients,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  @Get('list')
  async getClientsList(@Request() req) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    return this.prisma.client.findMany({
      where: { firmId: user.firmId },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('conflicts')
  async checkConflicts(@Request() req, @Query('q') q: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    if (!q || q.length < 3) return [];

    const clients = await this.prisma.client.findMany({
      where: { firmId: user.firmId, name: { contains: q, mode: 'insensitive' } },
      take: 5
    });
    
    const matters = await this.prisma.matter.findMany({
      where: { firmId: user.firmId, title: { contains: q, mode: 'insensitive' } },
      take: 5
    });

    return [
      ...clients.map(c => ({ type: 'client', id: c.id, name: c.name, clientType: c.type })),
      ...matters.map(m => ({ type: 'matter', id: m.id, name: m.title }))
    ];
  }

  @Get('similar')
  async checkSimilarClients(@Request() req, @Query('name') name: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    if (!name || name.length < 2) return [];

    const clients = await this.prisma.client.findMany({
      where: { firmId: user.firmId },
      select: { id: true, name: true },
    });

    const similar = clients
      .map(client => ({
        ...client,
        similarity: this.calculateSimilarity(name, client.name)
      }))
      .filter(item => item.similarity >= 0.6) // 60% similarity threshold
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return similar;
  }

  @Post()
  async createClient(@Request() req, @Body() body: { name: string; type: 'corporate' | 'individual' }) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const client = await this.prisma.client.create({
      data: { 
        firmId: user.firmId, 
        name: body.name, 
        type: body.type,
        verificationStatus: 'pending'
      },
    });
    
    await this.audit.log(user.firmId, user.id, AuditAction.CREATE, AuditEntityType.CLIENT, client.id, { name: client.name, type: client.type });
    return client;
  }

  @Get(':id')
  async getClient(@Request() req, @Param('id') id: string) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const client = await this.prisma.client.findFirst({
      where: { id, firmId: user.firmId },
      include: { matters: { include: { assignee: true }, orderBy: { createdAt: 'desc' } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  @Patch(':id')
  async updateClient(@Request() req, @Param('id') id: string, @Body() body: { name?: string; type?: 'corporate' | 'individual'; verificationStatus?: 'pending' | 'verified' | 'rejected' }) {
    const user = await this.requireFirm(req.user.sub, req.user.firmId);
    const existing = await this.prisma.client.findFirst({ where: { id, firmId: user.firmId } });
    if (!existing) throw new NotFoundException('Client not found');
    
    const client = await this.prisma.client.update({ where: { id }, data: body });
    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.CLIENT, id, { fields_changed: Object.keys(body) });
    return client;
  }
}
