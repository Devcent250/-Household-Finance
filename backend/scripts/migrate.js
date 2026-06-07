const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function migrate() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Create backend/.env from backend/.env.example first.');
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await client.query('BEGIN');

    // Apply schema (new tables + IF NOT EXISTS on existing)
    await client.query(sql);

    // Ensure extra columns that may not be in schema.sql
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false');

    // Add household_id columns to existing tables that may lack them
    const alterStatements = [
      'ALTER TABLE categories ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE',
      'ALTER TABLE expenses ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE',
      'ALTER TABLE income ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE',
      'ALTER TABLE budgets ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE',
      'ALTER TABLE financial_goals ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id) ON DELETE CASCADE',
    ];
    for (const stmt of alterStatements) {
      await client.query(stmt);
    }

    // Migrate existing users: create households and backfill household_id
    const usersWithoutHousehold = await client.query(
      'SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM household_members)'
    );
    for (const user of usersWithoutHousehold.rows) {
      const household = await client.query(
        `INSERT INTO households (name, owner_id) VALUES ($1, $2) RETURNING id`,
        [`Household of User #${user.id}`, user.id]
      );
      const householdId = household.rows[0].id;

      // Create default admin role
      const adminRole = await client.query(
        `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Admin', 'Full access') RETURNING id`,
        [householdId]
      );
      const allPerms = [
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
          [adminRole.rows[0].id, pk]
        );
      }
      // Create default member role
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

      // Add user as admin member
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)`,
        [householdId, user.id, adminRole.rows[0].id]
      );

      // Backfill household_id on existing data
      await client.query('UPDATE categories SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL', [householdId, user.id]);
      await client.query('UPDATE expenses SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL', [householdId, user.id]);
      await client.query('UPDATE income SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL', [householdId, user.id]);
      await client.query('UPDATE budgets SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL', [householdId, user.id]);
      await client.query('UPDATE financial_goals SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL', [householdId, user.id]);
    }

    await client.query('COMMIT');
    console.log('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error('Database migration failed.');
  console.error(error.message);
  process.exit(1);
});
