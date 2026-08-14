import { Controller, Post, Delete, Patch, Body, Param, UseGuards, Request, NotFoundException, ForbiddenException, Get } from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key);
}

@Controller('documents')
@UseGuards(ClerkAuthGuard)
export class DocumentsController {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async requireFirm(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.firmId) throw new ForbiddenException('You must belong to a Firm');
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

  @Post('presign')
  async getPresignedUrl(
    @Request() req,
    @Body() body: { matterId: string; fileName: string },
  ) {
    const user = await this.requireFirm(req.user.sub);
    const matter = await this.prisma.matter.findFirst({ where: { id: body.matterId, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    await this.ensureMatterAccess(user, matter);

    const storageKey = `${user.firmId}/${body.matterId}/${Date.now()}-${body.fileName}`;
    const { data, error } = await getSupabaseAdmin().storage
      .from('documents')
      .createSignedUploadUrl(storageKey);

    if (error) throw new Error(error.message);
    return { signedUrl: data.signedUrl, storageKey, token: data.token };
  }

  @Post(':id/view')
  async getViewUrl(@Request() req, @Param('id') id: string) {
    const user = await this.requireFirm(req.user.sub);
    const doc = await this.prisma.document.findFirst({ where: { id, firmId: user.firmId } });
    if (!doc) throw new NotFoundException('Document not found');

    const matter = await this.prisma.matter.findFirst({ where: { id: doc.matterId, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    await this.ensureMatterAccess(user, matter);

    const { data, error } = await getSupabaseAdmin().storage
      .from('documents')
      .createSignedUrl(doc.storageKey, 3600); // 1 hour

    if (error) throw new Error(error.message);

    await this.audit.log(user.firmId, user.id, AuditAction.VIEW, AuditEntityType.DOCUMENT, doc.id, { fileName: doc.name });

    return { signedUrl: data.signedUrl };
  }

  @Post()
  async registerDocument(
    @Request() req,
    @Body() body: { matterId: string; name: string; storageKey: string; mimeType?: string; sizeBytes?: number },
  ) {
    const user = await this.requireFirm(req.user.sub);
    const matter = await this.prisma.matter.findFirst({ where: { id: body.matterId, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    await this.ensureMatterAccess(user, matter);

    const doc = await this.prisma.document.create({
      data: {
        matterId: body.matterId,
        firmId: user.firmId,
        name: body.name,
        storageKey: body.storageKey,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        uploadedBy: req.user.sub,
      },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.CREATE, AuditEntityType.DOCUMENT, doc.id, { fileName: doc.name });
    return doc;
  }

  @Patch(':id')
  async updateDocument(@Request() req, @Param('id') id: string, @Body() body: { name?: string }) {
    const user = await this.requireFirm(req.user.sub);
    const doc = await this.prisma.document.findFirst({ where: { id, firmId: user.firmId } });
    if (!doc) throw new NotFoundException('Document not found');

    const matter = await this.prisma.matter.findFirst({ where: { id: doc.matterId, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    await this.ensureMatterAccess(user, matter);

    const updated = await this.prisma.document.update({
      where: { id },
      data: { name: body.name || doc.name },
    });

    await this.audit.log(user.firmId, user.id, AuditAction.UPDATE, AuditEntityType.DOCUMENT, doc.id, { fileName: updated.name });
    return updated;
  }

  @Delete(':id')
  async deleteDocument(@Request() req, @Param('id') id: string) {
    const user = await this.requireFirm(req.user.sub);
    const doc = await this.prisma.document.findFirst({ where: { id, firmId: user.firmId } });
    if (!doc) throw new NotFoundException('Document not found');

    const matter = await this.prisma.matter.findFirst({ where: { id: doc.matterId, firmId: user.firmId } });
    if (!matter) throw new NotFoundException('Matter not found');

    await this.ensureMatterAccess(user, matter);

    try {
      await getSupabaseAdmin().storage.from('documents').remove([doc.storageKey]);
    } catch (error) {
      // Ignore storage cleanup failures to keep deletion resilient while still removing the DB record.
    }

    await this.prisma.document.delete({ where: { id } });
    await this.audit.log(user.firmId, user.id, AuditAction.DELETE, AuditEntityType.DOCUMENT, doc.id, { fileName: doc.name });
    
    return { message: 'Document deleted' };
  }
}
