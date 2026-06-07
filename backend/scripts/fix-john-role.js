const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const vars = Object.fromEntries(env.split('\n').filter(Boolean).map(l => l.split('=').map(s => s.trim())));
const pool = new Pool({ connectionString: vars.DATABASE_URL });

(async () => {
  // Find admin role in Smith Family Home (id=13)
  const r = await pool.query(
    `SELECT hr.id FROM household_roles hr JOIN households h ON h.id = hr.household_id
     WHERE h.name = 'Smith Family Home' AND hr.name = 'Admin'`
  );
  const roleId = r.rows[0].id;

  // Get john's user id
  const u = await pool.query(`SELECT id FROM users WHERE email = 'john@family.com'`);
  const userId = u.rows[0].id;

  await pool.query(
    `UPDATE household_members SET role_id = $1
     WHERE household_id = (SELECT id FROM households WHERE name = 'Smith Family Home')
     AND user_id = $2`,
    [roleId, userId]
  );
  console.log('john@family.com is now Admin in Smith Family Home');
  await pool.end();
})();
