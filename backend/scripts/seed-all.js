/**
 * Full seed — clears all data, re-runs schema, creates users,
 * households, roles, and generous demo data.
 *
 * Usage:  node scripts/seed-all.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const vars = Object.fromEntries(
  envContent.split('\n').filter(Boolean).map((l) => l.split('=').map((s) => s.trim()))
);

const client = new Client({ connectionString: vars.DATABASE_URL });

function hash(pw) { return crypto.createHash('sha256').update(pw).digest('hex'); }

function ymd(year, month, day) {
  const maxDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
}

function dateFor(monthOffset, day) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const target = m + monthOffset;
  const d = new Date(y, target - 1, 1);
  return ymd(d.getFullYear(), d.getMonth() + 1, day);
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const PASSWORD = '1234567890';
const PASSWORD_HASH = hash(PASSWORD);

const ALL_PERMISSIONS = [
  'dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'income:create', 'income:view', 'income:edit', 'income:delete',
  'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
  'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
  'categories:manage', 'reports:view', 'analytics:view',
  'members:manage', 'roles:manage', 'settings:manage',
];

const memberPerms = ['dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit', 'income:create', 'income:view', 'income:edit', 'budgets:view', 'goals:create', 'goals:view', 'goals:edit', 'reports:view', 'analytics:view'];

const EXPENSE_CATS = [
  { name: 'Groceries', icon: 'shopping-cart', color: '#ef4444' },
  { name: 'Transport', icon: 'car', color: '#f97316' },
  { name: 'Rent', icon: 'home', color: '#8b5cf6' },
  { name: 'Utilities', icon: 'zap', color: '#06b6d4' },
  { name: 'Health', icon: 'heart', color: '#ec4899' },
  { name: 'Dining Out', icon: 'utensils', color: '#f59e0b' },
  { name: 'Entertainment', icon: 'tv', color: '#3b82f6' },
  { name: 'Clothing', icon: 'shirt', color: '#a855f7' },
  { name: 'Education', icon: 'book-open', color: '#10b981' },
  { name: 'Subscriptions', icon: 'repeat', color: '#64748b' },
  { name: 'Insurance', icon: 'shield', color: '#e11d48' },
  { name: 'Home Maintenance', icon: 'tool', color: '#78716c' },
  { name: 'Personal Care', icon: 'smile', color: '#d946ef' },
  { name: 'Gifts', icon: 'gift', color: '#f43f5e' },
  { name: 'Pets', icon: 'paw-print', color: '#a16207' },
];

const INCOME_CATS = [
  { name: 'Salary', icon: 'briefcase', color: '#22c55e' },
  { name: 'Freelance', icon: 'laptop', color: '#14b8a6' },
  { name: 'Investment', icon: 'trending-up', color: '#f59e0b' },
  { name: 'Rental', icon: 'building', color: '#6366f1' },
  { name: 'Business', icon: 'store', color: '#8b5cf6' },
];

const EXPENSE_DESC = [
  'Weekly grocery run', 'Fuel fill-up', 'Electricity bill', 'Water bill',
  'Internet subscription', 'Phone plan', 'Dinner at restaurant', 'Movie tickets',
  'Clothing purchase', 'Pharmacy', 'Doctor consultation', 'Gym membership',
  'Online shopping', 'Home supplies', 'Car maintenance', 'Insurance premium',
  'Pet food', 'Birthday gift', 'Books', 'Coffee shop',
  'Takeaway delivery', 'Parking fees', 'Taxi ride', 'Public transport',
  'Haircut', 'Skincare products', 'Cleaning supplies', 'Streaming service',
];

const INCOME_DESC = [
  'Monthly salary', 'Freelance project', 'Consulting work', 'Rental income',
  'Dividend payment', 'Interest earned', 'Side business revenue', 'Bonus payment',
  'Contract payment', 'Online course revenue',
];

const PAY_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Digital Wallet', 'Debit Order'];

async function createRoles(hhId) {
  const superRole = (await client.query(
    `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Superadmin', 'Full access') RETURNING id`, [hhId]
  )).rows[0].id;
  const adminRole = (await client.query(
    `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Admin', 'Household admin') RETURNING id`, [hhId]
  )).rows[0].id;
  const memberRole = (await client.query(
    `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Member', 'Standard permissions') RETURNING id`, [hhId]
  )).rows[0].id;

  for (const pk of ALL_PERMISSIONS) {
    await client.query(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [superRole, pk]);
    await client.query(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [adminRole, pk]);
  }
  for (const pk of memberPerms) {
    await client.query(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [memberRole, pk]);
  }
  return { superRole, adminRole, memberRole };
}

async function createCategories(hhId, userId) {
  const map = {};
  for (const cat of EXPENSE_CATS) {
    const r = await client.query(
      `INSERT INTO categories (household_id, user_id, name, icon, color, type, created_at)
       VALUES ($1, $2, $3, $4, $5, 'expense', NOW()) RETURNING id`,
      [hhId, userId, cat.name, cat.icon, cat.color]
    );
    map[`expense:${cat.name}`] = r.rows[0].id;
  }
  for (const cat of INCOME_CATS) {
    const r = await client.query(
      `INSERT INTO categories (household_id, user_id, name, icon, color, type, created_at)
       VALUES ($1, $2, $3, $4, $5, 'income', NOW()) RETURNING id`,
      [hhId, userId, cat.name, cat.icon, cat.color]
    );
    map[`income:${cat.name}`] = r.rows[0].id;
  }
  return map;
}

async function seedHousehold(name, ownerUserId, users, adminId, extraAdminIds = []) {
  const hh = await client.query(
    `INSERT INTO households (name, owner_id, currency, created_at) VALUES ($1, $2, 'USD', NOW()) RETURNING id`,
    [name, ownerUserId]
  );
  const hhId = hh.rows[0].id;
  console.log(`  ✓ Household "${name}" (id=${hhId})`);

  const roles = await createRoles(hhId);

  await client.query(
    `INSERT INTO household_members (household_id, user_id, role_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
    [hhId, adminId, roles.superRole]
  );
  await client.query(
    `INSERT INTO household_members (household_id, user_id, role_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
    [hhId, ownerUserId, roles.adminRole]
  );

  for (const u of users) {
    if (u.id === ownerUserId || u.id === adminId) continue;
    const role = extraAdminIds.includes(u.id) ? roles.adminRole : roles.memberRole;
    await client.query(
      `INSERT INTO household_members (household_id, user_id, role_id, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING`,
      [hhId, u.id, role]
    );
  }

  const catMap = await createCategories(hhId, ownerUserId);

  // Expenses: ~20-35 per month for 6 months
  let expCount = 0;
  for (let mo = -5; mo <= 0; mo++) {
    for (let i = 0, n = randomInt(20, 35); i < n; i++) {
      const cat = pick(EXPENSE_CATS);
      await client.query(
        `INSERT INTO expenses (household_id, user_id, category_id, amount, description, date, payment_method, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [hhId, ownerUserId, catMap[`expense:${cat.name}`], randomInt(500, 150000), pick(EXPENSE_DESC), dateFor(mo, randomInt(1, 28)), pick(PAY_METHODS)]
      );
      expCount++;
    }
  }
  console.log(`  ✓ ${expCount} expenses`);

  // Income: ~4-8 per month
  let incCount = 0;
  for (let mo = -5; mo <= 0; mo++) {
    for (let i = 0, n = randomInt(4, 8); i < n; i++) {
      const cat = pick(INCOME_CATS);
      await client.query(
        `INSERT INTO income (household_id, user_id, category_id, amount, description, date, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [hhId, ownerUserId, catMap[`income:${cat.name}`], randomInt(50000, 600000), pick(INCOME_DESC), dateFor(mo, randomInt(1, 28)), cat.name]
      );
      incCount++;
    }
  }
  console.log(`  ✓ ${incCount} income records`);

  // Budgets
  const budgetDefs = [
    { cat: 'Groceries', limit: 80000 }, { cat: 'Transport', limit: 40000 },
    { cat: 'Rent', limit: 90000 }, { cat: 'Utilities', limit: 25000 },
    { cat: 'Dining Out', limit: 30000 }, { cat: 'Entertainment', limit: 25000 },
    { cat: 'Clothing', limit: 40000 }, { cat: 'Subscriptions', limit: 20000 },
    { cat: 'Health', limit: 35000 }, { cat: 'Insurance', limit: 30000 },
  ];
  const ps = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
  for (const b of budgetDefs) {
    await client.query(
      `INSERT INTO budgets (household_id, user_id, category_id, limit_amount, period, alert_threshold, period_start_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'monthly', 80, $5, NOW(), NOW())`,
      [hhId, ownerUserId, catMap[`expense:${b.cat}`], b.limit, ps]
    );
  }
  console.log(`  ✓ ${budgetDefs.length} budgets`);

  // Goals
  const goals = [
    { name: 'Emergency Fund', target: 3000000, current: 850000, dlMonths: 12, cat: 'savings', pri: 'high' },
    { name: 'Family Holiday', target: 1500000, current: 450000, dlMonths: 8, cat: 'travel', pri: 'medium' },
    { name: 'New Car', target: 5000000, current: 1200000, dlMonths: 18, cat: 'savings', pri: 'medium' },
    { name: 'Home Renovation', target: 2000000, current: 600000, dlMonths: 10, cat: 'savings', pri: 'low' },
    { name: 'Debt Repayment', target: 800000, current: 350000, dlMonths: 5, cat: 'debt', pri: 'high' },
    { name: 'Investment Portfolio', target: 5000000, current: 1500000, dlMonths: 24, cat: 'investment', pri: 'medium' },
    { name: 'Education Fund', target: 10000000, current: 2000000, dlMonths: 60, cat: 'savings', pri: 'high' },
    { name: 'New Laptop', target: 250000, current: 180000, dlMonths: 2, cat: 'electronics', pri: 'medium' },
  ];
  for (const g of goals) {
    const dl = new Date(); dl.setMonth(dl.getMonth() + g.dlMonths);
    const deadline = `${dl.getFullYear()}-${String(dl.getMonth() + 1).padStart(2, '0')}-${String(dl.getDate()).padStart(2, '0')}`;
    await client.query(
      `INSERT INTO financial_goals (household_id, user_id, name, target_amount, current_amount, deadline, category, priority, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [hhId, ownerUserId, g.name, g.target, g.current, deadline, g.cat, g.pri]
    );
  }
  console.log(`  ✓ ${goals.length} goals`);

  return hhId;
}

async function run() {
  await client.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure schema columns that schema.sql may not have
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false`);

    // 2. Clear all data (order matters for FK constraints)
    const tables = [
      'household_role_permissions', 'household_roles', 'household_members',
      'financial_goals', 'budgets', 'income', 'expenses',
      'categories', 'transactions_history', 'households', 'users',
    ];
    for (const t of tables) {
      await client.query(`DELETE FROM ${t}`);
    }
    console.log('✓ All tables cleared');

    // 2. Create super admin
    const admin = await client.query(
      `INSERT INTO users (email, full_name, password_hash, is_super_admin, currency, created_at)
       VALUES ('admin@admin.com', 'Super Admin', $1, true, 'USD', NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = $1, is_super_admin = true
       RETURNING id, email`,
      [PASSWORD_HASH]
    );
    const adminId = admin.rows[0].id;
    console.log(`✓ Super admin: admin@admin.com / ${PASSWORD} (id=${adminId})`);

    // 3. Create seed users
    const userDefs = [
      { email: 'john@family.com', name: 'John Family' },
      { email: 'sarah@family.com', name: 'Sarah Family' },
      { email: 'mike@example.com', name: 'Mike Johnson' },
    ];
    const users = [];
    for (const u of userDefs) {
      const r = await client.query(
        `INSERT INTO users (email, full_name, password_hash, currency, created_at)
         VALUES ($1, $2, $3, 'USD', NOW()) ON CONFLICT (email) DO UPDATE SET password_hash = $3, full_name = $2
         RETURNING id, email, full_name`,
        [u.email, u.name, PASSWORD_HASH]
      );
      users.push(r.rows[0]);
      console.log(`  ✓ ${r.rows[0].email} / ${PASSWORD}  (${r.rows[0].full_name})`);
    }

    // 4. Seed households with data
    console.log(`\n── Seeding "Smith Family Home" ──`);
    await seedHousehold('Smith Family Home', adminId, users, adminId, [users[0].id]);

    console.log(`\n── Seeding "Ocean View Apartments" ──`);
    await seedHousehold('Ocean View Apartments', users[0].id, users, adminId);

    await client.query('COMMIT');

    console.log(`\n=== Seed complete ===`);
    console.log(`Passwords: all users use "${PASSWORD}"`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
