const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  await client.query(`CREATE TABLE IF NOT EXISTS households (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('households: OK');

  await client.query(`CREATE TABLE IF NOT EXISTS household_roles (
    id SERIAL PRIMARY KEY,
    household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('household_roles: OK');

  await client.query(`CREATE TABLE IF NOT EXISTS household_role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES household_roles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) NOT NULL,
    UNIQUE(role_id, permission_key)
  )`);
  console.log('household_role_permissions: OK');

  await client.query(`CREATE TABLE IF NOT EXISTS household_members (
    id SERIAL PRIMARY KEY,
    household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES household_roles(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(household_id, user_id)
  )`);
  console.log('household_members: OK');

  const tables = ['categories', 'expenses', 'income', 'budgets', 'financial_goals'];
  for (const table of tables) {
    await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE`);
    console.log(`${table}: household_id column added`);
  }

  // Migrate existing users to households
  const usersResult = await client.query('SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM household_members)');
  for (const user of usersResult.rows) {
    const userId = user.id;
    const hhResult = await client.query(
      `INSERT INTO households (name, owner_id) VALUES ($1, $2) RETURNING id`,
      [`Household #${userId}`, userId]
    );
    const householdId = hhResult.rows[0].id;

    const adminRole = await client.query(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Admin', 'Full access') RETURNING id`,
      [householdId]
    );
    const adminRoleId = adminRole.rows[0].id;

    const allPerms = [
      'dashboard:view',
      'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
      'income:create', 'income:view', 'income:edit', 'income:delete',
      'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
      'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
      'categories:manage', 'reports:view', 'analytics:view',
      'members:manage', 'roles:manage', 'settings:manage',
    ];
    for (const pk of allPerms) {
      await client.query(
        `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
        [adminRoleId, pk]
      );
    }

    const memberRole = await client.query(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Member', 'Basic access') RETURNING id`,
      [householdId]
    );
    const memberPerms = ['expenses:create', 'expenses:view', 'expenses:edit', 'income:create', 'income:view', 'income:edit', 'goals:view', 'goals:edit', 'budgets:view', 'reports:view', 'analytics:view'];
    for (const pk of memberPerms) {
      await client.query(
        `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
        [memberRole.rows[0].id, pk]
      );
    }

    await client.query(
      `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)`,
      [householdId, userId, adminRoleId]
    );

    await client.query(`UPDATE categories SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL`, [householdId, userId]);
    await client.query(`UPDATE expenses SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL`, [householdId, userId]);
    await client.query(`UPDATE income SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL`, [householdId, userId]);
    await client.query(`UPDATE budgets SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL`, [householdId, userId]);
    await client.query(`UPDATE financial_goals SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL`, [householdId, userId]);

    console.log(`  User #${userId}: household ${householdId} created, data migrated`);
  }

  if (usersResult.rows.length === 0) {
    console.log('No users to migrate');
  }

  await client.end();
  console.log('Migration complete');
}

run().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
