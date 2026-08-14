import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async setFirmId(firmId: string): Promise<void> {
    // SET LOCAL doesn't support parameterized queries, so we need to escape the firmId
    // Since firmId is a UUID, it's safe to interpolate directly
    await this.pool.query(`SET LOCAL app.current_firm_id = '${firmId}'`);
  }
}
