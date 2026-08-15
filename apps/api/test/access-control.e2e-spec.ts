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

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 1: Cross-Tenant Isolation (RLS) — Client table
  // ─────────────────────────────────────────────────────────────────────────
  describe('Cross-Tenant Isolation (RLS) — Client', () => {
    it('should block Firm B user from accessing Firm A clients (RLS → 404)', async () => {
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
      await request(app.getHttpServer())
        .get(`/clients/${clientA.id}`)
        .set('Authorization', `Bearer ${createMockToken(userB.id, userB.firmId!)}`)
        .expect(404); // RLS makes the row invisible → NotFoundException

      // Cleanup
      await prisma.client.delete({ where: { id: clientA.id } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.user.delete({ where: { id: userB.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
      await prisma.firm.delete({ where: { id: firmBId } });
    });

    it('should allow Firm A user to access their own clients (→ 200)', async () => {
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
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId!)}`)
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
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId!)}`)
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

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 2: Cross-Tenant Isolation (RLS) — Matter table
  // ─────────────────────────────────────────────────────────────────────────
  describe('Cross-Tenant Isolation (RLS) — Matter', () => {
    it('should block Firm B user from accessing Firm A matters (RLS → 404)', async () => {
      const firmAId = randomUUID();
      const firmBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();
      const clientAId = randomUUID();

      await prisma.firm.create({ data: { id: firmAId, name: 'Firm A', status: 'active' } });
      await prisma.firm.create({ data: { id: firmBId, name: 'Firm B', status: 'active' } });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('matter-usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      const userB = await prisma.user.create({
        data: {
          id: userBId,
          clerkId: `user_b_${randomUUID()}`,
          email: generateTestEmail('matter-userb'),
          firmId: firmBId,
          role: 'admin',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientAId, name: 'Client A', type: 'individual', firmId: firmAId },
      });

      const matterA = await prisma.matter.create({
        data: {
          firmId: firmAId,
          clientId: clientAId,
          title: 'Matter A',
          status: 'active',
          assignedTo: userA.id,
        },
      });

      // Firm B user should not be able to see Firm A's matter — RLS makes row invisible → 404
      await request(app.getHttpServer())
        .get(`/matters/${matterA.id}`)
        .set('Authorization', `Bearer ${createMockToken(userB.id, userB.firmId!)}`)
        .expect(404);

      // Cleanup
      await prisma.matter.delete({ where: { id: matterA.id } });
      await prisma.client.delete({ where: { id: clientAId } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.user.delete({ where: { id: userB.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
      await prisma.firm.delete({ where: { id: firmBId } });
    });

    it('should allow Firm A user to access their own matters (→ 200)', async () => {
      const firmAId = randomUUID();
      const userAId = randomUUID();
      const clientAId = randomUUID();

      await prisma.firm.create({ data: { id: firmAId, name: 'Firm A', status: 'active' } });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('matter-own-usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientAId, name: 'Client A', type: 'individual', firmId: firmAId },
      });

      const matterA = await prisma.matter.create({
        data: {
          firmId: firmAId,
          clientId: clientAId,
          title: 'Matter A',
          status: 'active',
          assignedTo: userA.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/matters/${matterA.id}`)
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId!)}`)
        .expect(200);

      expect(response.body.id).toBe(matterA.id);
      expect(response.body.title).toBe('Matter A');

      // Cleanup
      await prisma.matter.delete({ where: { id: matterA.id } });
      await prisma.client.delete({ where: { id: clientAId } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
    });

    it('should return only Firm A matters when Firm A user lists matters', async () => {
      const firmAId = randomUUID();
      const firmBId = randomUUID();
      const userAId = randomUUID();
      const userBId = randomUUID();
      const clientAId = randomUUID();
      const clientBId = randomUUID();

      await prisma.firm.create({ data: { id: firmAId, name: 'Firm A', status: 'active' } });
      await prisma.firm.create({ data: { id: firmBId, name: 'Firm B', status: 'active' } });

      const userA = await prisma.user.create({
        data: {
          id: userAId,
          clerkId: `user_a_${randomUUID()}`,
          email: generateTestEmail('matter-list-usera'),
          firmId: firmAId,
          role: 'admin',
          status: 'active',
        },
      });

      const userB = await prisma.user.create({
        data: {
          id: userBId,
          clerkId: `user_b_${randomUUID()}`,
          email: generateTestEmail('matter-list-userb'),
          firmId: firmBId,
          role: 'admin',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientAId, name: 'Client A', type: 'individual', firmId: firmAId },
      });
      await prisma.client.create({
        data: { id: clientBId, name: 'Client B', type: 'individual', firmId: firmBId },
      });

      const matterA = await prisma.matter.create({
        data: { firmId: firmAId, clientId: clientAId, title: 'Matter A', status: 'active', assignedTo: userA.id },
      });
      const matterB = await prisma.matter.create({
        data: { firmId: firmBId, clientId: clientBId, title: 'Matter B', status: 'active', assignedTo: userB.id },
      });

      const response = await request(app.getHttpServer())
        .get('/matters')
        .set('Authorization', `Bearer ${createMockToken(userA.id, userA.firmId!)}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      // All returned matters must belong to Firm A
      response.body.forEach((matter: any) => {
        expect(matter.firmId).toBe(firmAId);
      });
      // Firm B's matter must not appear
      const returnedIds = response.body.map((m: any) => m.id);
      expect(returnedIds).not.toContain(matterB.id);

      // Cleanup
      await prisma.matter.delete({ where: { id: matterA.id } });
      await prisma.matter.delete({ where: { id: matterB.id } });
      await prisma.client.delete({ where: { id: clientAId } });
      await prisma.client.delete({ where: { id: clientBId } });
      await prisma.user.delete({ where: { id: userA.id } });
      await prisma.user.delete({ where: { id: userB.id } });
      await prisma.firm.delete({ where: { id: firmAId } });
      await prisma.firm.delete({ where: { id: firmBId } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Suite 3: Within-firm access control — restricted matters / MatterAccess
  // ─────────────────────────────────────────────────────────────────────────
  describe('Restricted Matter Access Control (MatterAccess)', () => {
    it('should return 403 when a non-admin user WITHOUT MatterAccess tries to access a restricted matter', async () => {
      const firmId = randomUUID();
      const assigneeId = randomUUID();
      const unauthorizedUserId = randomUUID();
      const clientId = randomUUID();

      await prisma.firm.create({ data: { id: firmId, name: 'Firm X', status: 'active' } });

      // Assignee (the user the matter is assigned to)
      const assignee = await prisma.user.create({
        data: {
          id: assigneeId,
          clerkId: `assignee_${randomUUID()}`,
          email: generateTestEmail('assignee'),
          firmId,
          role: 'lawyer',
          status: 'active',
        },
      });

      // Unauthorized user — same firm, non-admin, NOT the assignee, NO MatterAccess
      const unauthorizedUser = await prisma.user.create({
        data: {
          id: unauthorizedUserId,
          clerkId: `unauth_${randomUUID()}`,
          email: generateTestEmail('unauth'),
          firmId,
          role: 'lawyer',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientId, name: 'Client X', type: 'individual', firmId },
      });

      // Restricted matter — assigned to assignee only
      const restrictedMatter = await prisma.matter.create({
        data: {
          firmId,
          clientId,
          title: 'Restricted Matter',
          status: 'active',
          isRestricted: true,
          assignedTo: assignee.id,
        },
      });

      // Unauthorized user hits GET /matters/:id — expects 403 Forbidden
      await request(app.getHttpServer())
        .get(`/matters/${restrictedMatter.id}`)
        .set('Authorization', `Bearer ${createMockToken(unauthorizedUser.id, unauthorizedUser.firmId!)}`)
        .expect(403);

      // Cleanup
      await prisma.matter.delete({ where: { id: restrictedMatter.id } });
      await prisma.client.delete({ where: { id: clientId } });
      await prisma.user.delete({ where: { id: assignee.id } });
      await prisma.user.delete({ where: { id: unauthorizedUser.id } });
      await prisma.firm.delete({ where: { id: firmId } });
    });

    it('should return 200 when a user WITH MatterAccess accesses a restricted matter', async () => {
      const firmId = randomUUID();
      const assigneeId = randomUUID();
      const authorizedUserId = randomUUID();
      const clientId = randomUUID();

      await prisma.firm.create({ data: { id: firmId, name: 'Firm Y', status: 'active' } });

      const assignee = await prisma.user.create({
        data: {
          id: assigneeId,
          clerkId: `assignee_${randomUUID()}`,
          email: generateTestEmail('assignee2'),
          firmId,
          role: 'lawyer',
          status: 'active',
        },
      });

      const authorizedUser = await prisma.user.create({
        data: {
          id: authorizedUserId,
          clerkId: `auth_${randomUUID()}`,
          email: generateTestEmail('auth'),
          firmId,
          role: 'lawyer',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientId, name: 'Client Y', type: 'individual', firmId },
      });

      const restrictedMatter = await prisma.matter.create({
        data: {
          firmId,
          clientId,
          title: 'Restricted Matter 2',
          status: 'active',
          isRestricted: true,
          assignedTo: assignee.id,
        },
      });

      // Grant MatterAccess to the authorized user
      await prisma.matterAccess.create({
        data: { matterId: restrictedMatter.id, userId: authorizedUser.id },
      });

      // Authorized user can now access the matter
      const response = await request(app.getHttpServer())
        .get(`/matters/${restrictedMatter.id}`)
        .set('Authorization', `Bearer ${createMockToken(authorizedUser.id, authorizedUser.firmId!)}`)
        .expect(200);

      expect(response.body.id).toBe(restrictedMatter.id);
      expect(response.body.isRestricted).toBe(true);

      // Cleanup — MatterAccess cascades on Matter delete
      await prisma.matter.delete({ where: { id: restrictedMatter.id } });
      await prisma.client.delete({ where: { id: clientId } });
      await prisma.user.delete({ where: { id: assignee.id } });
      await prisma.user.delete({ where: { id: authorizedUser.id } });
      await prisma.firm.delete({ where: { id: firmId } });
    });

    it('should return 200 when an admin accesses a restricted matter they are not assigned to', async () => {
      const firmId = randomUUID();
      const assigneeId = randomUUID();
      const adminId = randomUUID();
      const clientId = randomUUID();

      await prisma.firm.create({ data: { id: firmId, name: 'Firm Z', status: 'active' } });

      const assignee = await prisma.user.create({
        data: {
          id: assigneeId,
          clerkId: `assignee_${randomUUID()}`,
          email: generateTestEmail('assignee3'),
          firmId,
          role: 'lawyer',
          status: 'active',
        },
      });

      const admin = await prisma.user.create({
        data: {
          id: adminId,
          clerkId: `admin_${randomUUID()}`,
          email: generateTestEmail('admin'),
          firmId,
          role: 'admin',
          status: 'active',
        },
      });

      await prisma.client.create({
        data: { id: clientId, name: 'Client Z', type: 'individual', firmId },
      });

      const restrictedMatter = await prisma.matter.create({
        data: {
          firmId,
          clientId,
          title: 'Restricted Matter 3',
          status: 'active',
          isRestricted: true,
          assignedTo: assignee.id,
        },
      });

      // Admin can override ethical walls
      const response = await request(app.getHttpServer())
        .get(`/matters/${restrictedMatter.id}`)
        .set('Authorization', `Bearer ${createMockToken(admin.id, admin.firmId!)}`)
        .expect(200);

      expect(response.body.id).toBe(restrictedMatter.id);

      // Cleanup
      await prisma.matter.delete({ where: { id: restrictedMatter.id } });
      await prisma.client.delete({ where: { id: clientId } });
      await prisma.user.delete({ where: { id: assignee.id } });
      await prisma.user.delete({ where: { id: admin.id } });
      await prisma.firm.delete({ where: { id: firmId } });
    });
  });
});
