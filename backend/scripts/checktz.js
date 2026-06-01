const { Pool } = require('pg');
const fs = require('fs'), path = require('path');
const lines = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/);
for (const l of lines) {
    const s = l.indexOf('=');
    if (s > -1) { const k = l.slice(0, s).trim(), v = l.slice(s + 1).trim(); if (k && !process.env[k]) process.env[k] = v; }
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT CURRENT_DATE AS db_date, NOW() AS db_now").then(r => {
    console.log('DB date/time:', r.rows[0]);
    return pool.query("SHOW timezone");
}).then(r => {
    console.log('DB timezone:', r.rows[0]);
    pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
