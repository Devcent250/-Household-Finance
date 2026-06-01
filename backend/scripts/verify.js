const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const lines = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/);
for (const l of lines) {
    const s = l.indexOf('=');
    if (s > -1) {
        const k = l.slice(0, s).trim(), v = l.slice(s + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
    }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    // Show raw date values as stored
    const expenses = await pool.query(
        "SELECT date::text AS date_text, amount, description FROM expenses WHERE user_id=2 ORDER BY date DESC LIMIT 5"
    );
    console.log('Latest 5 expenses (raw date from DB):');
    expenses.rows.forEach(r => console.log(' ', r.date_text, r.amount, r.description));

    // Check what month the DB thinks today is
    const dbDate = await pool.query("SELECT CURRENT_DATE::text AS today, DATE_TRUNC('month', CURRENT_DATE)::text AS month_start");
    console.log('\nDB CURRENT_DATE:', dbDate.rows[0]);

    // Count expenses in June 2026 using a hardcoded range
    const june = await pool.query(
        "SELECT COUNT(*), SUM(amount) FROM expenses WHERE user_id=2 AND date >= '2026-06-01' AND date < '2026-07-01'"
    );
    console.log('Expenses in June 2026 (hardcoded range):', june.rows[0]);

    // Count expenses in May 2026
    const may = await pool.query(
        "SELECT COUNT(*), SUM(amount) FROM expenses WHERE user_id=2 AND date >= '2026-05-01' AND date < '2026-06-01'"
    );
    console.log('Expenses in May 2026 (hardcoded range):', may.rows[0]);

    await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
