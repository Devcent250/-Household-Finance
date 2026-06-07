/**
 * Clears all financial/transactional data from the database
 * while preserving user accounts.
 *
 * Delete order respects FK constraints:
 * 1. transactions_history (no FKs to other data tables)
 * 2. expenses (FK to categories with ON DELETE RESTRICT)
 * 3. income (FK to categories with ON DELETE RESTRICT)
 * 4. budgets (FK to categories with ON DELETE CASCADE)
 * 5. financial_goals
 * 6. categories (FK to users/households)
 * 7. household_role_permissions
 * 8. household_roles
 * 9. household_members
 * 10. households
 *
 * Users table is left untouched.
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);

const pool = new Pool({
  connectionString: envVars.DATABASE_URL,
});

async function clean() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tables = [
      'transactions_history',
      'expenses',
      'income',
      'budgets',
      'financial_goals',
      'categories',
      'household_role_permissions',
      'household_roles',
      'household_members',
      'households',
    ];

    for (const table of tables) {
      const res = await client.query(`DELETE FROM ${table}`);
      console.log(`  ✓ ${table}: ${res.rowCount} row(s) deleted`);
    }

    await client.query('COMMIT');
    console.log('\nDone. All data cleared. Users table preserved.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clean();
