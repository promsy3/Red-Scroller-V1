const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const DB_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const API = 'http://localhost:3001';

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function makeToken(userId, firmId, role) {
  return jwt.sign({ sub: userId, email: 'test@test.com', firmId, role }, Buffer.from(JWT_SECRET, 'utf8'), { algorithm: 'HS256', expiresIn: '1h' });
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  const client = await pool.connect();
  const id = () => require('crypto').randomUUID();
  const firmId = id(), adminId = id(), lawyerId = id(), outsiderId = id(), clientId = id(), matterId = id();

  console.log('\n=== Phase 3 Self-Test ===\n');
  let passed = 0, failed = 0;

  const check = (label, condition, extra = '') => {
    if (condition) { console.log(`  ✅ ${label}`); passed++; }
    else { console.log(`  ❌ ${label}${extra ? ' — ' + extra : ''}`); failed++; }
  };

  try {
    // --- Seed ---
    await client.query(`INSERT INTO "Firm" (id, name) VALUES ($1, 'Phase3TestFirm')`, [firmId]);
    await client.query(`INSERT INTO "User" (id, email, role, "firmId", status) VALUES ($1,$2,'admin',$3,'active')`, [adminId, 'admin@p3.test', firmId]);
    await client.query(`INSERT INTO "User" (id, email, role, "firmId", status) VALUES ($1,$2,'lawyer',$3,'active')`, [lawyerId, 'lawyer@p3.test', firmId]);
    await client.query(`INSERT INTO "User" (id, email, role, "firmId", status) VALUES ($1,$2,'lawyer',$3,'active')`, [outsiderId, 'outsider@p3.test', firmId]);
    await client.query(`INSERT INTO "Client" (id, "firmId", name) VALUES ($1,$2,'TestConflictCorp')`, [clientId, firmId]);
    console.log('Seeded test data');

    const adminToken = await makeToken(adminId, firmId, 'admin');
    const lawyerToken = await makeToken(lawyerId, firmId, 'lawyer');
    const outsiderToken = await makeToken(outsiderId, firmId, 'lawyer');

    // --- Test: Conflict Check ---
    console.log('\n1. Conflict Check (GET /clients/conflicts?q=TestConflict)');
    const conflicts = await api('GET', '/clients/conflicts?q=TestConflict', adminToken);
    check('Returns conflict results', conflicts.status === 200);
    check('Finds TestConflictCorp', conflicts.data.some(c => c.name.includes('TestConflict')));

    // --- Test: Create Normal Matter ---
    console.log('\n2. Create Non-Restricted Matter');
    const m1 = await api('POST', '/matters', adminToken, { title: 'Normal Matter', clientId });
    check('201 created', m1.status === 201);

    // --- Test: Create Restricted Matter ---
    console.log('\n3. Create Restricted Matter (Ethical Wall)');
    const m2 = await api('POST', '/matters', adminToken, { title: 'Restricted Matter', clientId, isRestricted: true });
    check('201 created with isRestricted', m2.status === 201 && m2.data.isRestricted === true);
    const restrictedId = m2.data.id;

    // --- Test: Ethical Wall — Outsider Cannot See Restricted Matter ---
    console.log('\n4. Ethical Wall — Outsider blocked from GET /matters');
    const outsiderMatters = await api('GET', '/matters', outsiderToken);
    const sees = (outsiderMatters.data || []).some(m => m.id === restrictedId);
    check('Outsider does NOT see restricted matter in list', !sees);

    // --- Test: Ethical Wall — Outsider blocked from detail view ---
    console.log('\n5. Ethical Wall — Outsider blocked from GET /matters/:id');
    const outsiderDetail = await api('GET', `/matters/${restrictedId}`, outsiderToken);
    check('403 Forbidden for outsider', outsiderDetail.status === 403, `got ${outsiderDetail.status}`);

    // --- Test: Admin CAN see restricted matter ---
    console.log('\n6. Admin override — can see restricted matter');
    const adminDetail = await api('GET', `/matters/${restrictedId}`, adminToken);
    check('200 Admin sees restricted matter', adminDetail.status === 200, `got ${adminDetail.status}`);

    // --- Test: Grant access to outsider ---
    console.log('\n7. Grant outsider access to restricted matter');
    const grant = await api('POST', `/matters/${restrictedId}/access`, adminToken, { userId: outsiderId });
    check('201 Access granted', grant.status === 201, `got ${grant.status}`);

    const outsiderDetailAfter = await api('GET', `/matters/${restrictedId}`, outsiderToken);
    check('200 Outsider now sees matter after grant', outsiderDetailAfter.status === 200, `got ${outsiderDetailAfter.status}`);

    // --- Test: Audit Log ---
    console.log('\n8. Audit Log (GET /audit)');
    const logs = await api('GET', '/audit', adminToken);
    check('200 Audit logs returned', logs.status === 200);
    check('Logs contain MATTER entries', Array.isArray(logs.data) && logs.data.some(l => l.entityType === 'MATTER'));

    // --- Test: Diary ---
    console.log('\n9. Diary (POST + GET /diary)');
    const event = await api('POST', '/diary', adminToken, { title: 'Court Hearing', date: new Date(Date.now() + 86400000).toISOString() });
    check('201 Event created', event.status === 201, `got ${event.status}`);

    const events = await api('GET', '/diary', adminToken);
    check('200 Events fetched', events.status === 200);
    check('Contains created event', Array.isArray(events.data) && events.data.some(e => e.title === 'Court Hearing'));

    // --- Summary ---
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  } finally {
    // Cleanup
    await client.query(`DELETE FROM "AuditLog" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "DiaryEvent" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "MatterAccess" WHERE "matterId" IN (SELECT id FROM "Matter" WHERE "firmId" = $1)`, [firmId]);
    await client.query(`DELETE FROM "Document" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "Matter" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "Client" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "FirmJoinRequest" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "User" WHERE "firmId" = $1`, [firmId]);
    await client.query(`DELETE FROM "Firm" WHERE id = $1`, [firmId]);
    console.log('Cleaned up test data');
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
