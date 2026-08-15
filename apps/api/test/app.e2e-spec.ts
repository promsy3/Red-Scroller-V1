import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TestModule } from './test.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let testUserId: string;
  let testFirmId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.$connect();
    await app.init();

    // Seed a minimal user so TestAuthGuard can authenticate requests
    testFirmId = randomUUID();
    testUserId = randomUUID();
    await prisma.firm.create({ data: { id: testFirmId, name: 'Test Firm', status: 'active' } });
    await prisma.user.create({
      data: {
        id: testUserId,
        clerkId: `clerk_${randomUUID()}`,
        email: `app_e2e_${randomUUID()}@test.example.com`,
        firmId: testFirmId,
        role: 'admin',
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    // Teardown seeded data
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.firm.deleteMany({ where: { id: testFirmId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('/ (GET) returns Hello World with a valid auth token', () => {
    const token = `mock_jwt_token_${testUserId}_${testFirmId}`;
    return request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Hello World!');
  });
});
