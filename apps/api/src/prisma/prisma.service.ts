import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { AsyncLocalStorage } from 'async_hooks';

export const rlsContext = new AsyncLocalStorage<{ firmId: string }>();

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
}

export function createPrismaService() {
  const service = new PrismaService();
  return service.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const store = rlsContext.getStore();
          if (store?.firmId) {
            const [, , result] = await service.$transaction([
              service.$executeRaw`SET LOCAL role = 'authenticated'`,
              service.$executeRaw`SELECT set_config('app.current_firm_id', ${store.firmId}, TRUE)`,
              query(args),
            ]);
            return result;
          }
          return query(args);
        }
      }
    }
  }) as unknown as PrismaService;
}
