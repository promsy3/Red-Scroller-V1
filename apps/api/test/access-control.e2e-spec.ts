import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestModule } from './test.module';
import request from 'supertest';
import { randomUUID } from 'crypto';

describe('RLS Cross-Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    await prisma.$connect();
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // Helper to create a mock JWT token for a user
  function createMockToken(userId: string, firmId: string): string {
    return `mock_jwt_token_${userId}_${firmId}`;
  }

  // Helper to generate unique test email
  function generateTestEmail(prefix: string): string {
    return `${prefix}_${randomUUID()}@test.example.com`;
  }

  describe('Cross-Tenant Isolation (RLS)', () => {
    it('should block Firm B user from accessing Firm A clients', async () => {
      // Create Firm A and a client
      const firmAId = randomUUID();
      const firmBId = randomUUID();
      const clientAId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();
      
      await prisma.firm.create({
        data: { id: firmAId, name: 'Firm A', status: 'active' },
      });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      const clientA = await prisma.client.create({
        data: {
          id: clientAId,
          name: 'Client A',
          type: 'individual',
          firmId: firmAId,
        },
      });

      // Create Firm B and a user
      await prisma.firm.create({
        data: { id: firmBId, name: 'Firm B', status: 'active' },
      });

      const userB = await prisma.user.create({
        data: {
          id: userBId,
          clerkId: `user_b_${randomUUID()}`,
          email: generateTestEmail('userb'),
          firmId: firmBId,
          role: 'admin',
          status: 'active',
        },
      });

      // Firm B user should not be able to access Firm A's client due to RLS
      const response = await request(app.getHttpServer())
        .get(`/clients/${clientA.id}`)
        .set('Authorization', `Bearer ${createMockToken(userB.id, userB.firmId)}`)
        .expect(404); // RLS blocks access

      // Cleanup
      await prisma.client.delete({ where: { id: clientA.id } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.user.delete({ where: { id: userB.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
      await prisma.firm.delete({ where: { id: firmBId } });
    });

    it('should allow Firm A user to access their own clients', async () => {
      const firmAId = randomUUID();
      const clientAId = randomUUID();
      const userAId = randomUUID();
      
      await prisma.firm.create({
        data: { id: firmAId, name: 'Firm A', status: 'active' },
      });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      const clientA = await prisma.client.create({
        data: {
          id: clientAId,
          name: 'Client A',
          type: 'individual',
          firmId: firmAId,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/clients/${clientA.id}`)
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId)}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(clientA.id);
      expect(response.body.name).toBe('Client A');

      // Cleanup
      await prisma.client.delete({ where: { id: clientA.id } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
    });

    it('should return only Firm A clients when Firm A user lists clients', async () => {
      const firmAId = randomUUID();
      const firmBId = randomUUID();
      const userAId = randomUUID();
      const clientAId = randomUUID();
      const clientBId = randomUUID();
      
      await prisma.firm.create({
        data: { id: firmAId, name: 'Firm A', status: 'active' },
      });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      const clientA = await prisma.client.create({
        data: {
          id: clientAId,
          name: 'Client A',
          type: 'individual',
          firmId: firmAId,
        },
      });

      await prisma.firm.create({
        data: { id: firmBId, name: 'Firm B', status: 'active' },
      });

      const clientB = await prisma.client.create({
        data: {
          id: clientBId,
          name: 'Client B',
          type: 'individual',
          firmId: firmBId,
        },
      });

      const response = await request(app.getHttpServer())
        .get('/clients')
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId)}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((client: any) => {
        expect(client.firmId).toBe(firmAId);
      });

      // Cleanup
      await prisma.client.delete({ where: { id: clientA.id } });
      await prisma.client.delete({ where: { id: clientB.id } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
      await prisma.firm.delete({ where: { id: firmBId } });
    });
  });
});
