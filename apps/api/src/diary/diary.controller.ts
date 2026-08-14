import { Body, Controller, Get, Param, Post, Patch, Delete, Request, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '@prisma/client';

@Controller('diary')
@UseGuards(ClerkAuthGuard)
export class DiaryController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async requireFirm(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm to access diary events');
    return user as typeof user & { firmId: string };
  }

  private async ensureMatterAccess(user: { id: string; role: string; firmId: string }, matter: { id: string; isRestricted: boolean; assignedTo: string | null }) {
    if (matter.isRestricted && user.role !== 'admin' && matter.assignedTo !== user.id) {
      const hasAccess = await this.prisma.matterAccess.findFirst({ where: { matterId: matter.id, userId: user.id } });
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to this restricted matter');
      }
    }
  }

  @Get()
  async getEvents(@Request() req) {
    const user = await this.requireFirm(req.user.sub);
    const events = await this.prisma.diaryEvent.findMany({
      where: { firmId: user.firmId },
      orderBy: { date: 'asc' },
      include: { matter: { select: { id: true, title: true, isRestricted: true, assignedTo: true } } }
    });

    const visibleEvents = [] as any[];
    for (const event of events) {
      if (!event.matter) {
        visibleEvents.push(event);
        continue;
      }

      try {
        await this.ensureMatterAccess(user, event.matter);
        visibleEvents.push(event);
      } catch {
        // Hide restricted matters the user cannot access.
      }
    }

    return visibleEvents;
  }

  @Post()
  async createEvent(@Request() req, @Body() body: { title: string; description?: string; date: string; type: 'meeting' | 'court_date' | 'filing_deadline'; matterId?: string }) {
    const user = await this.requireFirm(req.user.sub);

    if (body.matterId) {
      const matter = await this.prisma.matter.findFirst({ where: { id: body.matterId, firmId: user.firmId } });
      if (!matter) throw new NotFoundException('Matter not found');
      await this.ensureMatterAccess(user, matter);
    }

    const event = await this.prisma.diaryEvent.create({
      data: {
        firmId: user.firmId,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        type: body.type,
        matterId: body.matterId || null,
      },
      include: { matter: true },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.CREATE, AuditEntityType.DIARY_EVENT, event.id, { title: event.title, type: event.type });
    return event;
  }

  @Patch(':id')
  async updateEvent(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; date?: string; type?: 'meeting' | 'court_date' | 'filing_deadline'; matterId?: string | null },
  ) {
    const user = await this.requireFirm(req.user.sub);
    const event = await this.prisma.diaryEvent.findFirst({ where: { id, firmId: user.firmId } });
    if (!event) throw new NotFoundException('Diary event not found');

    if (event.matterId) {
      const existingMatter = await this.prisma.matter.findFirst({ where: { id: event.matterId, firmId: user.firmId } });
      if (!existingMatter) throw new NotFoundException('Matter not found');
      await this.ensureMatterAccess(user, existingMatter);
    }

    if (body.matterId) {
      const targetMatter = await this.prisma.matter.findFirst({ where: { id: body.matterId, firmId: user.firmId } });
      if (!targetMatter) throw new NotFoundException('Matter not found');
      await this.ensureMatterAccess(user, targetMatter);
    }

    const data: { title?: string; description?: string; date?: Date; type?: 'meeting' | 'court_date' | 'filing_deadline'; matterId?: string | null; reminderSent?: boolean } = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.date !== undefined) {
      data.date = new Date(body.date);
      data.reminderSent = false; // Reset reminder flag when date changes
    }
    if (body.type !== undefined) data.type = body.type;
    if (body.matterId !== undefined) data.matterId = body.matterId || null;

    const updated = await this.prisma.diaryEvent.update({ where: { id }, data });
    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.DIARY_EVENT, id, {
      fields_changed: Object.keys(data),
    });
    return updated;
  }

  @Delete(':id')
  async deleteEvent(@Request() req, @Param('id') id: string) {
    const user = await this.requireFirm(req.user.sub);
    const event = await this.prisma.diaryEvent.findFirst({ where: { id, firmId: user.firmId } });
    if (!event) throw new NotFoundException('Event not found');

    if (event.matterId) {
      const matter = await this.prisma.matter.findFirst({ where: { id: event.matterId, firmId: user.firmId } });
      if (!matter) throw new NotFoundException('Matter not found');
      await this.ensureMatterAccess(user, matter);
    }

    await this.prisma.diaryEvent.delete({ where: { id } });
    await this.audit.log(user.firmId, user.id, AuditAction.DELETE, AuditEntityType.DIARY_EVENT, id, { title: event.title });
    return { success: true };
  }
}
