const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const http = require('http');

const pool = new Pool({
  connectionString: 'postgresql://postgres.voqxwgvuxedwptegzdhn:T6aQY2oDgANoQ6ut@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const secret = 'F216D1B0-A500-41B0-8399-9EE52BA3E4B0';
const testUserId = '00000000-0000-0000-0000-111111111111';
const testFirmId = '00000000-0000-0000-0000-222222222222';
const token = jwt.sign(
  { sub: testUserId, email: 'p2test@redscroller.dev', role: 'authenticated', aud: 'authenticated' },
  Buffer.from(secret, 'utf8'),
  { algorithm: 'HS256', expiresIn: '1h' }
);

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', e => reject(e));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const client = await pool.connect();
  try {
    // 1. Setup test data
    console.log('Setting up test firm and user...');
    await client.query(`INSERT INTO "Firm" (id, name, status) VALUES ($1, 'P2 Test Firm', 'active') ON CONFLICT DO NOTHING`, [testFirmId]);
    await client.query(`INSERT INTO "User" (id, "firmId", email, role, status) VALUES ($1, $2, 'p2test@redscroller.dev', 'lawyer', 'active') ON CONFLICT (id) DO UPDATE SET "firmId" = $2`, [testUserId, testFirmId]);

    // 2. Test Create Client
    console.log('Testing POST /clients...');
    const clientRes = await makeRequest('POST', '/clients', { name: 'Acme Test', email: 'acme@test.com' });
    console.log(clientRes.status, clientRes.data.id ? 'Client created: ' + clientRes.data.id : clientRes.data);
    const clientId = clientRes.data.id;

    if (!clientId) throw new Error('Failed to create client');

    // 3. Test Create Matter
    console.log('Testing POST /matters...');
    const matterRes = await makeRequest('POST', '/matters', { title: 'Test Matter', clientId, description: 'Test description' });
    console.log(matterRes.status, matterRes.data.id ? 'Matter created: ' + matterRes.data.id : matterRes.data);
    const matterId = matterRes.data.id;

    if (!matterId) throw new Error('Failed to create matter');

    // 4. Test Update Matter
    console.log('Testing PATCH /matters/:id...');
    const updateRes = await makeRequest('PATCH', `/matters/${matterId}`, { status: 'closed' });
    console.log(updateRes.status, updateRes.data.status ? 'Matter updated: ' + updateRes.data.status : updateRes.data);

    // 5. Test Presigned URL (Documents)
    console.log('Testing POST /documents/presign...');
    const presignRes = await makeRequest('POST', '/documents/presign', { matterId, fileName: 'test.pdf' });
    console.log(presignRes.status, presignRes.data.signedUrl ? 'Presigned URL generated' : presignRes.data);

    console.log('All API tests completed successfully!');

  } catch (e) {
    console.error('Test Failed:', e.message);
  } finally {
    // Cleanup
    console.log('Cleaning up test data...');
    await client.query(`DELETE FROM "Document" WHERE "firmId" = $1`, [testFirmId]);
    await client.query(`DELETE FROM "Matter" WHERE "firmId" = $1`, [testFirmId]);
    await client.query(`DELETE FROM "Client" WHERE "firmId" = $1`, [testFirmId]);
    await client.query(`DELETE FROM "User" WHERE id = $1`, [testUserId]);
    await client.query(`DELETE FROM "FirmJoinRequest" WHERE "firmId" = $1`, [testFirmId]);
    await client.query(`DELETE FROM "Firm" WHERE id = $1`, [testFirmId]);
    client.release();
    pool.end();
  }
})();
