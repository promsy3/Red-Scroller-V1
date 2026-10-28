import { FirmsController } from './firms.controller';

describe('FirmsController - Cross-Tenant Isolation', () => {
  let controller: FirmsController;
  let prismaMock: any;
  let audit: any;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      firm: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      client: { findMany: jest.fn() },
      matter: { findMany: jest.fn() },
      firmRequest: { findMany: jest.fn() },
      firmJoinRequest: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    };
    audit = { log: jest.fn() };
    controller = new FirmsController(prismaMock, audit);
  });

  it('can be instantiated', () => {
    expect(controller).toBeDefined();
  });

  // The unscoped GET /firms listing (getFirms) was deliberately removed in e1412a4
  // because it exposed every firm to any signed-in user. It must not come back.
  it('does not expose an unscoped firm listing', () => {
    expect((controller as any).getFirms).toBeUndefined();
  });

  it('createFirm creates the firm and makes the creator an admin', async () => {
    const created = { id: 'firm-1', name: 'Test Firm', status: 'active' };
    prismaMock.firm.create.mockResolvedValue(created);
    prismaMock.user.update.mockResolvedValue({});

    const result = await controller.createFirm({ user: { sub: 'user-1' } }, { name: 'Test Firm' });

    expect(prismaMock.firm.create).toHaveBeenCalledWith({
      data: { name: 'Test Firm' },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firmId: 'firm-1', role: 'admin', status: 'active' },
    });
    expect(result).toEqual(created);
  });

  it('getFirmMembers only lists members of the requesting user own firm', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'admin' });
    const members = [{ id: 'u2', email: 'a@x.com', role: 'lawyer', status: 'active' }];
    prismaMock.user.findMany.mockResolvedValue(members);

    const result = await controller.getFirmMembers({ user: { sub: 'user-1', firmId: 'firm-1' } });

    // scoped to the caller's firm - never a cross-tenant listing
    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: { firmId: 'firm-1', status: 'active' },
      select: { id: true, email: true, role: true, status: true },
      orderBy: { email: 'asc' },
    });
    expect(result).toEqual(members);
  });

  it('getFirmMembers rejects users without a firm', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: null });

    await expect(
      controller.getFirmMembers({ user: { sub: 'user-1' } })
    ).rejects.toThrow('You must belong to a Firm');
    expect(prismaMock.user.findMany).not.toHaveBeenCalled();
  });
});
