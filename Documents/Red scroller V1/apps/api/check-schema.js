const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='User' AND table_schema='public'")
  .then(r => { console.log('User columns:', r.rows.map(r => r.column_name).join(', ')); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
