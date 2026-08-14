import { FirmsController } from './firms.controller';

describe('FirmsController - Cross-Tenant Isolation', () => {
  let controller: FirmsController;
  let prismaMock: any;
  let audit: any;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      firm: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      client: { findMany: jest.fn() },
      matter: { findMany: jest.fn() },
      firmRequest: { findMany: jest.fn() },
    };
    audit = { log: jest.fn() };
    controller = new FirmsController(prismaMock, audit);
  });

  it('can be instantiated', () => {
    expect(controller).toBeDefined();
  });

  it('returns firms', async () => {
    prismaMock.firm.findMany.mockResolvedValue([
      { id: 'firm-1', name: 'Test Firm', status: 'active' },
    ]);

    const result = await controller.getFirms();

    expect(prismaMock.firm.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, status: true },
    });
    expect(result).toEqual([{ id: 'firm-1', name: 'Test Firm', status: 'active' }]);
  });
});