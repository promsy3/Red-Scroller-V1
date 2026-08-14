import { ClientsController } from './clients.controller';

describe('ClientsController', () => {
  let controller: ClientsController;
  let prisma: any;
  let audit: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      client: { findMany: jest.fn() },
      matter: { findMany: jest.fn() },
    };
    audit = { log: jest.fn() };
    controller = new ClientsController(prisma, audit);
  });

  it('returns empty results for short queries', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });

    const result = await controller.checkConflicts({ user: { sub: 'user-1' } }, 'ab');

    expect(result).toEqual([]);
  });

  it('returns matching clients and matters for the current firm', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prisma.client.findMany.mockResolvedValue([{ id: 'client-1', name: 'Acme Corp' }]);
    prisma.matter.findMany.mockResolvedValue([{ id: 'matter-1', title: 'Acme Dispute' }]);

    const result = await controller.checkConflicts({ user: { sub: 'user-1' } }, 'acme');

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { firmId: 'firm-1', name: { contains: 'acme', mode: 'insensitive' } },
      take: 5,
    });
    expect(prisma.matter.findMany).toHaveBeenCalledWith({
      where: { firmId: 'firm-1', title: { contains: 'acme', mode: 'insensitive' } },
      take: 5,
    });
    expect(result).toEqual([
      { type: 'client', id: 'client-1', name: 'Acme Corp' },
      { type: 'matter', id: 'matter-1', name: 'Acme Dispute' },
    ]);
  });

  describe('fuzzy name matching', () => {
    it('calculates Levenshtein distance correctly', () => {
      const controller = new ClientsController(prisma, audit);
      
      expect((controller as any).levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect((controller as any).levenshteinDistance('saturday', 'sunday')).toBe(3);
      expect((controller as any).levenshteinDistance('Raphael', 'Rafael')).toBe(2);
      expect((controller as any).levenshteinDistance('Raphael', 'Raphael Jr')).toBe(3);
    });

    it('calculates similarity score correctly', () => {
      const controller = new ClientsController(prisma, audit);
      
      expect((controller as any).calculateSimilarity('Raphael', 'Raphael')).toBe(1);
      expect((controller as any).calculateSimilarity('Raphael', 'Rafael')).toBeCloseTo(0.75, 1);
      expect((controller as any).calculateSimilarity('Raphael', 'Raphael Jr')).toBeCloseTo(0.7, 1);
    });

    it('filters similar clients with 60% threshold', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
      prisma.client.findMany.mockResolvedValue([
        { id: 'client-1', name: 'Raphael' },
        { id: 'client-2', name: 'Rafael' },
        { id: 'client-3', name: 'Totally Different' },
      ]);

      const result = await controller.checkSimilarClients({ user: { sub: 'user-1' } }, 'Raphael');

      expect(result).toHaveLength(2);
      expect(result.every((r: any) => r.similarity >= 0.6)).toBe(true);
    });

    it('returns empty for short names', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });

      const result = await controller.checkSimilarClients({ user: { sub: 'user-1' } }, 'R');

      expect(result).toEqual([]);
    });
  });
});
