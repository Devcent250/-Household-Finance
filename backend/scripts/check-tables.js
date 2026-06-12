const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
  .then(r => { console.table(r.rows); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
