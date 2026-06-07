const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const vars = Object.fromEntries(env.split('\n').filter(Boolean).map(l => l.split('=').map(s => s.trim())));
const pool = new Pool({ connectionString: vars.DATABASE_URL });

(async () => {
  const r = await pool.query(`SELECT conname AS name, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'categories'::regclass`);
  console.log(JSON.stringify(r.rows, null, 2));
  await pool.end();
})();
