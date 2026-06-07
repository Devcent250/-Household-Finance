/**
 * Full reset — drops all tables, re-runs migration, then seeds.
 *
 * Usage:  npm run reset
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const vars = Object.fromEntries(
  envContent.split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);

async function run() {
  const client = new Client({ connectionString: vars.DATABASE_URL });
  await client.connect();

  console.log('Dropping all tables...');
  await client.query(`
    DROP TABLE IF EXISTS transactions_history CASCADE;
    DROP TABLE IF EXISTS household_role_permissions CASCADE;
    DROP TABLE IF EXISTS household_members CASCADE;
    DROP TABLE IF EXISTS household_roles CASCADE;
    DROP TABLE IF EXISTS financial_goals CASCADE;
    DROP TABLE IF EXISTS budgets CASCADE;
    DROP TABLE IF EXISTS income CASCADE;
    DROP TABLE IF EXISTS expenses CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS households CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
  console.log('✓ All tables dropped');
  await client.end();

  console.log('Running migration...');
  const migrate = new Client({ connectionString: vars.DATABASE_URL });
  await migrate.connect();
  await migrate.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8'));
  await migrate.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false');
  await migrate.end();
  console.log('✓ Migration complete');

  console.log('\nRunning seed...');
  execSync('node ' + path.join(__dirname, 'seed-all.js'), { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  console.log('\n✓ Reset complete');
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
