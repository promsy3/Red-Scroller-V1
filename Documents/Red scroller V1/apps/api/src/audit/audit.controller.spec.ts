import { ForbiddenException } from '@nestjs/common';
import { AuditController } from './audit.controller';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: any;

  beforeEach(() => {
    auditService = {
      getLogs: jest.fn(),
      exportLogs: jest.fn(),
    };
    controller = new AuditController(auditService);
  });

  it('rejects non-admins from exporting audit logs', async () => {
    const req = { user: { role: 'lawyer', firmId: 'firm-1' } };

    await expect(controller.exportLogs(req)).rejects.toThrow(ForbiddenException);
  });
});
