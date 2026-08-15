import { MattersController } from './matters.controller';

describe('MattersController - Fuzzy Name Matching', () => {
  let controller: MattersController;
  let prismaMock: any;
  let audit: any;

  beforeEach(() => {
    prismaMock = {
      user: { findUnique: jest.fn() },
      matter: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
      client: { findFirst: jest.fn() },
      matterAccess: { findFirst: jest.fn() },
    };
    audit = { log: jest.fn() };
    const emailService = { sendMatterAccessGranted: jest.fn().mockResolvedValue(undefined) };
    controller = new MattersController(prismaMock, audit, emailService as any);
  });

  it('calculates Levenshtein distance correctly', () => {
    const emailService = { sendMatterAccessGranted: jest.fn().mockResolvedValue(undefined) };
    const testController = new MattersController(prismaMock, audit, emailService as any);
    
    expect((testController as any).levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect((testController as any).levenshteinDistance('saturday', 'sunday')).toBe(3);
    expect((testController as any).levenshteinDistance('Raphael', 'Rafael')).toBe(2);
    expect((testController as any).levenshteinDistance('Raphael', 'Raphael Jr')).toBe(3);
  });

  it('calculates similarity score correctly', () => {
    const emailService = { sendMatterAccessGranted: jest.fn().mockResolvedValue(undefined) };
    const testController = new MattersController(prismaMock, audit, emailService as any);
    
    expect((testController as any).calculateSimilarity('Raphael', 'Raphael')).toBe(1);
    expect((testController as any).calculateSimilarity('Raphael', 'Rafael')).toBeCloseTo(0.75, 1);
    expect((testController as any).calculateSimilarity('Raphael', 'Raphael Jr')).toBeCloseTo(0.7, 1);
  });

  it('filters similar matters with 60% threshold', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', firmId: 'firm-1', role: 'lawyer' });
    prismaMock.matter.findMany.mockResolvedValue([
      { id: 'matter-1', title: 'Property' },
      { id: 'matter-2', title: 'Property Sale' },
      { id: 'matter-3', title: 'Totally Different' },
    ]);

    const result = await controller.checkSimilarMatters({ user: { sub: 'user-1' } }, 'Property');

    expect(result).toHaveLength(2);
    expect(result.every((r: any) => r.similarity >= 0.6)).toBe(true);
  });
});