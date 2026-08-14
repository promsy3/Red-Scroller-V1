const { Pool } = require('pg');

const statements = [
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'OVERRIDE'); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditEntityType') THEN CREATE TYPE "AuditEntityType" AS ENUM ('MATTER', 'CLIENT', 'DOCUMENT', 'FIRM', 'USER'); END IF; END $$`,
  
  `ALTER TABLE "Matter" ADD COLUMN IF NOT EXISTS "isRestricted" BOOLEAN NOT NULL DEFAULT false`,

  `CREATE TABLE IF NOT EXISTS "MatterAccess" (
    "id" UUID NOT NULL,
    "matterId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatterAccess_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MatterAccess_matterId_userId_key" ON "MatterAccess"("matterId", "userId")`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID NOT NULL,
    "firmId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
  )`,

  `CREATE TABLE IF NOT EXISTS "DiaryEvent" (
    "id" UUID NOT NULL,
    "firmId" UUID NOT NULL,
    "matterId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiaryEvent_pkey" PRIMARY KEY ("id")
  )`,

  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MatterAccess_matterId_fkey') THEN ALTER TABLE "MatterAccess" ADD CONSTRAINT "MatterAccess_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MatterAccess_userId_fkey') THEN ALTER TABLE "MatterAccess" ADD CONSTRAINT "MatterAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AuditLog_firmId_fkey') THEN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'AuditLog_actorId_fkey') THEN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,

  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DiaryEvent_firmId_fkey') THEN ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'DiaryEvent_matterId_fkey') THEN ALTER TABLE "DiaryEvent" ADD CONSTRAINT "DiaryEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  let passed = 0, failed = 0;
  try {
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        console.log('OK:', stmt.trim().substring(0, 60).replace(/\n/g, ' '));
        passed++;
      } catch (e) {
        console.error('FAIL:', e.message.substring(0, 120));
        failed++;
      }
    }
    console.log(`\nResult: ${passed} OK, ${failed} FAILED`);
  } finally {
    client.release();
    await pool.end();
  }
})();
