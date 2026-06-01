/**
 * Shifts all current-month expenses and income (those in May 2026 that should be June 2026)
 * forward by 1 day so they land in the correct month.
 * Also fixes the budget period_start_date to June 1.
 */
const { Pool } = require('pg');
const fs = require('fs'), path = require('path');
const lines = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/);
for (const l of lines) {
    const s = l.indexOf('=');
    if (s > -1) { const k = l.slice(0, s).trim(), v = l.slice(s + 1).trim(); if (k && !process.env[k]) process.env[k] = v; }
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    await pool.query('BEGIN');
    try {
        // Shift May 2026 expenses → June 2026 (add 1 day) for all users
        const e = await pool.query(
            "UPDATE expenses SET date = date + INTERVAL '1 day' WHERE date >= '2026-05-01' AND date < '2026-06-01' AND date >= '2026-05-12'"
        );
        console.log(`Shifted ${e.rowCount} expense rows from May → June`);

        const i = await pool.query(
            "UPDATE income SET date = date + INTERVAL '1 day' WHERE date >= '2026-05-01' AND date < '2026-06-01' AND date >= '2026-05-12'"
        );
        console.log(`Shifted ${i.rowCount} income rows from May → June`);

        // Fix budget period_start_date to June 1
        const b = await pool.query(
            "UPDATE budgets SET period_start_date = '2026-06-01' WHERE period_start_date = '2026-05-01'"
        );
        console.log(`Fixed ${b.rowCount} budget period_start_date rows`);

        await pool.query('COMMIT');
        console.log('Done.');
    } catch (err) {
        await pool.query('ROLLBACK');
        throw err;
    } finally {
        await pool.end();
    }
}

run().catch(e => { console.error(e.message); pool.end(); });
