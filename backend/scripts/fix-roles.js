/* Add Superadmin role, assign roles properly */
const { Client } = require('pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const vars = Object.fromEntries(
  envContent.split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);

const pool = new Pool({ connectionString: vars.DATABASE_URL });

const ALL_PERMS = [
  'dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'income:create', 'income:view', 'income:edit', 'income:delete',
  'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
  'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
  'categories:manage', 'reports:view', 'analytics:view',
  'members:manage', 'roles:manage', 'settings:manage',
];

async function ensureRole(hhId, name, perms) {
  const existing = await pool.query(
    `SELECT id FROM household_roles WHERE household_id = $1 AND name = $2`, [hhId, name]
  );
  if (existing.rows.length) {
    const roleId = existing.rows[0].id;
    await pool.query(`DELETE FROM household_role_permissions WHERE role_id = $1`, [roleId]);
    for (const pk of perms) {
      await pool.query(
        `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, pk]
      );
    }
    return roleId;
  }
  const r = await pool.query(
    `INSERT INTO household_roles (household_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
    [hhId, name, `${name} role`]
  );
  const roleId = r.rows[0].id;
  for (const pk of perms) {
    await pool.query(
      `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [roleId, pk]
    );
  }
  return roleId;
}

async function assign(userId, hhId, roleId) {
  await pool.query(
    `DELETE FROM household_members WHERE user_id = $1 AND household_id = $2`,
    [userId, hhId]
  );
  await pool.query(
    `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)`,
    [hhId, userId, roleId]
  );
}

async function run() {
  try {
    // hh 11 = Smith Family Home (owner admin@=6)
    // hh 12 = Ocean View Apartments (owner john@=11)
    const hhs = await pool.query(`SELECT id, name, owner_id FROM households ORDER BY id`);
    console.log('Households:', JSON.stringify(hhs.rows, null, 2));

    for (const hh of hhs.rows) {
      console.log(`\n── ${hh.name} (id=${hh.id}) ──`);

      const superRole = await ensureRole(hh.id, 'Superadmin', ALL_PERMS);
      const adminRole = await ensureRole(hh.id, 'Admin', ALL_PERMS);
      const memberRole = await ensureRole(hh.id, 'Member', [
        'dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit',
        'income:create', 'income:view', 'income:edit',
        'budgets:view', 'goals:create', 'goals:view', 'goals:edit',
        'reports:view', 'analytics:view',
      ]);

      // Superadmin = admin@admin.com (user 6)
      await assign(6, hh.id, superRole);
      console.log(`  → user 6 (admin) → Superadmin`);

      // All other members: owner gets Admin, rest get Member
      const members = await pool.query(
        `SELECT user_id FROM household_members WHERE household_id = $1 AND user_id != 6`,
        [hh.id]
      );

      for (const m of members.rows) {
        const targetRole = (m.user_id === hh.owner_id) ? adminRole : memberRole;
        const label = (m.user_id === hh.owner_id) ? 'Admin' : 'Member';
        await assign(m.user_id, hh.id, targetRole);
        console.log(`  → user ${m.user_id} → ${label}`);
      }
    }

    console.log('\n✓ Roles updated');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
