import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: any;
  let prisma: any;

  beforeEach(() => {
    auditService = {
      getLogs: jest.fn(),
      exportLogs: jest.fn(),
    };
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' }),
      },
    };
    controller = new AuditController(auditService, prisma);
  });

  it('rejects non-admins from exporting audit logs', async () => {
    const req = { user: { sub: 'user-1' } };

    await expect(controller.exportLogs(req)).rejects.toThrow(ForbiddenException);
  });
});
