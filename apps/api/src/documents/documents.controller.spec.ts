import { ForbiddenException } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    prisma = {
      user: { findUnique: jest.fn() },
      matter: { findFirst: jest.fn() },
      document: { findFirst: jest.fn(), delete: jest.fn(), update: jest.fn() },
      matterAccess: { findFirst: jest.fn() },
    };
    audit = { log: jest.fn() };
    (createClient as jest.Mock).mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.test/file' }, error: null }),
          remove: jest.fn().mockResolvedValue({ error: null }),
        }),
      },
    });
    controller = new DocumentsController(prisma, audit);
  });

  it('rejects uploads for restricted matters when the user has no MatterAccess entry', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(controller.getPresignedUrl({ user: { sub: 'user-1' } }, { matterId: 'matter-1', fileName: 'brief.pdf' })).rejects.toThrow(ForbiddenException);
  });

  it('returns a signed view URL for an authorized user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', matterId: 'matter-1', firmId: 'firm-1', name: 'brief.pdf' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: false, assignedTo: 'user-1' });
    prisma.matterAccess.findFirst.mockResolvedValue({});

    const result = await controller.getViewUrl({ user: { sub: 'user-1' } }, 'doc-1');

    expect(result).toEqual({ signedUrl: 'https://example.test/file' });
  });

  it('rejects document views for restricted matters when the user has no MatterAccess entry', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', matterId: 'matter-1', firmId: 'firm-1', name: 'brief.pdf' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(controller.getViewUrl({ user: { sub: 'user-1' } }, 'doc-1')).rejects.toThrow(ForbiddenException);
  });

  it('rejects document deletion for restricted matters when the user has no MatterAccess entry', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', matterId: 'matter-1', firmId: 'firm-1', name: 'brief.pdf' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: true, assignedTo: 'other-user' });
    prisma.matterAccess.findFirst.mockResolvedValue(null);

    await expect(controller.deleteDocument({ user: { sub: 'user-1' } }, 'doc-1')).rejects.toThrow(ForbiddenException);
  });

  it('allows an authorized user to rename a document', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', matterId: 'matter-1', firmId: 'firm-1', name: 'brief.pdf' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1', firmId: 'firm-1', isRestricted: false, assignedTo: 'user-1' });
    prisma.document.update.mockResolvedValue({ id: 'doc-1', name: 'updated.pdf' });

    const result = await controller.updateDocument({ user: { sub: 'user-1' } }, 'doc-1', { name: 'updated.pdf' });

    expect(result).toEqual({ id: 'doc-1', name: 'updated.pdf' });
  });
});
