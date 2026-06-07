/**
 * Comprehensive seed — creates household structure and generous dummy data
 * for the admin user (admin@admin.com / id=6).
 *
 * Run: node scripts/seed-big.js
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
const DATABASE_URL = vars.DATABASE_URL;

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

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ADMIN_ID = 6;

const HOUSEHOLD = { name: "Kamansi Family Home" };

const ALL_PERMISSIONS = [
  'dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'income:create', 'income:view', 'income:edit', 'income:delete',
  'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
  'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
  'categories:manage', 'reports:view', 'analytics:view',
  'members:manage', 'roles:manage', 'settings:manage',
];

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

const EXPENSE_DESCRIPTIONS = [
  'Weekly grocery run', 'Fuel fill-up', 'Electricity bill', 'Water bill',
  'Internet subscription', 'Phone plan', 'Dinner at restaurant', 'Movie tickets',
  'Clothing purchase', 'Pharmacy', 'Doctor consultation', 'Gym membership',
  'Online shopping', 'Home supplies', 'Car maintenance', 'Insurance premium',
  'Pet food', 'Birthday gift', 'Books', 'Coffee shop',
  'Takeaway delivery', 'Parking fees', 'Taxi ride', 'Public transport',
  'Haircut', 'Skincare products', 'Cleaning supplies', 'Garden supplies',
  'Streaming service', 'Cloud storage',
];

const INCOME_DESCRIPTIONS = [
  'Monthly salary', 'Freelance project', 'Consulting work', 'Rental income',
  'Dividend payment', 'Interest earned', 'Side business revenue', 'Bonus payment',
  'Contract payment', 'Online course revenue', 'Affiliate income', 'Royalty payment',
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');

    // 1. Create household
    const hhRes = await client.query(
      `INSERT INTO households (name, owner_id, currency, created_at)
       VALUES ($1, $2, 'USD', NOW()) RETURNING id`,
      [HOUSEHOLD.name, ADMIN_ID]
    );
    const hhId = hhRes.rows[0].id;
    console.log(`✓ Household "${HOUSEHOLD.name}" created (id=${hhId})`);

    // Reuse the same transaction for all queries
    const q = (sql, params) => client.query(sql, params);

    // 2. Create default roles + permissions
    const adminRole = (await q(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Admin', 'Full access to all household features') RETURNING id`,
      [hhId]
    )).rows[0].id;

    const memberRole = (await q(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Member', 'Standard member with basic permissions') RETURNING id`,
      [hhId]
    )).rows[0].id;

    const viewerRole = (await q(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, 'Viewer', 'Read-only access') RETURNING id`,
      [hhId]
    )).rows[0].id;

    const viewerPerms = ['dashboard:view', 'expenses:view', 'income:view', 'budgets:view', 'goals:view', 'reports:view', 'analytics:view'];
    const memberPerms = ['dashboard:view', 'expenses:create', 'expenses:view', 'expenses:edit', 'income:create', 'income:view', 'income:edit', 'budgets:view', 'goals:create', 'goals:view', 'goals:edit', 'reports:view', 'analytics:view'];

    for (const pk of ALL_PERMISSIONS) {
      await q(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [adminRole, pk]);
    }
    for (const pk of memberPerms) {
      await q(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [memberRole, pk]);
    }
    for (const pk of viewerPerms) {
      await q(`INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`, [viewerRole, pk]);
    }
    console.log(`✓ 3 roles created with permissions`);

    // 3. Add admin as member
    await q(
      `INSERT INTO household_members (household_id, user_id, role_id, created_at) VALUES ($1, $2, $3, NOW())`,
      [hhId, ADMIN_ID, adminRole]
    );
    console.log(`✓ Admin user added as member`);

    // 4. Also add the other users as members with Member role if they exist
    const otherUsers = (await q(`SELECT id FROM users WHERE id != $1`, [ADMIN_ID])).rows;
    for (const u of otherUsers) {
      await q(
        `INSERT INTO household_members (household_id, user_id, role_id, created_at) VALUES ($1, $2, $3, NOW())
         ON CONFLICT (household_id, user_id) DO NOTHING`,
        [hhId, u.id, memberRole]
      );
    }
    if (otherUsers.length > 0) console.log(`✓ ${otherUsers.length} additional user(s) added as members`);

    // 5. Create categories
    const catMap = {};
    for (const cat of EXPENSE_CATS) {
      const res = await q(
        `INSERT INTO categories (household_id, user_id, name, icon, color, type, created_at)
         VALUES ($1, $2, $3, $4, $5, 'expense', NOW()) RETURNING id`,
        [hhId, ADMIN_ID, cat.name, cat.icon, cat.color]
      );
      catMap[`expense:${cat.name}`] = res.rows[0].id;
    }
    for (const cat of INCOME_CATS) {
      const res = await q(
        `INSERT INTO categories (household_id, user_id, name, icon, color, type, created_at)
         VALUES ($1, $2, $3, $4, $5, 'income', NOW()) RETURNING id`,
        [hhId, ADMIN_ID, cat.name, cat.icon, cat.color]
      );
      catMap[`income:${cat.name}`] = res.rows[0].id;
    }
    console.log(`✓ ${EXPENSE_CATS.length + INCOME_CATS.length} categories created`);

    // 6. Generate BIG expenses — 6 months of data, ~20-30 per month
    let expenseCount = 0;
    const payMethods = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Digital Wallet', 'Debit Order'];
    for (let mo = -5; mo <= 0; mo++) {
      const numExpenses = randomInt(20, 35);
      for (let i = 0; i < numExpenses; i++) {
        const cat = pick(EXPENSE_CATS);
        const amount = randomInt(500, 150000);
        const day = randomInt(1, 28);
        await q(
          `INSERT INTO expenses (household_id, user_id, category_id, amount, description, date, payment_method, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [hhId, ADMIN_ID, catMap[`expense:${cat.name}`], amount, pick(EXPENSE_DESCRIPTIONS), dateFor(mo, day), pick(payMethods)]
        );
        expenseCount++;
      }
    }
    console.log(`✓ ${expenseCount} expenses inserted (6 months)`);

    // 7. Generate income — ~4-8 per month
    let incomeCount = 0;
    for (let mo = -5; mo <= 0; mo++) {
      const numIncome = randomInt(4, 8);
      for (let i = 0; i < numIncome; i++) {
        const cat = pick(INCOME_CATS);
        const amount = randomInt(50000, 600000);
        const day = randomInt(1, 28);
        await q(
          `INSERT INTO income (household_id, user_id, category_id, amount, description, date, source, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [hhId, ADMIN_ID, catMap[`income:${cat.name}`], amount, pick(INCOME_DESCRIPTIONS), dateFor(mo, day), cat.name]
        );
        incomeCount++;
      }
    }
    console.log(`✓ ${incomeCount} income records inserted (6 months)`);

    // 8. Budgets
    const budgets = [
      { cat: 'Groceries', limit: 80000 },
      { cat: 'Transport', limit: 40000 },
      { cat: 'Rent', limit: 90000 },
      { cat: 'Utilities', limit: 25000 },
      { cat: 'Dining Out', limit: 30000 },
      { cat: 'Entertainment', limit: 25000 },
      { cat: 'Clothing', limit: 40000 },
      { cat: 'Subscriptions', limit: 20000 },
      { cat: 'Health', limit: 35000 },
      { cat: 'Insurance', limit: 30000 },
    ];
    const periodStart = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    for (const b of budgets) {
      await q(
        `INSERT INTO budgets (household_id, user_id, category_id, limit_amount, period, alert_threshold, period_start_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'monthly', 80, $5, NOW(), NOW())`,
        [hhId, ADMIN_ID, catMap[`expense:${b.cat}`], b.limit, periodStart]
      );
    }
    console.log(`✓ ${budgets.length} budgets created`);

    // 9. Goals
    const goals = [
      { name: 'Emergency Fund', target: 3000000, current: 850000, deadlineMonths: 12, category: 'savings', priority: 'high' },
      { name: 'Holiday to Japan', target: 1500000, current: 450000, deadlineMonths: 8, category: 'travel', priority: 'medium' },
      { name: 'New Car', target: 5000000, current: 1200000, deadlineMonths: 18, category: 'savings', priority: 'medium' },
      { name: 'Home Renovation', target: 2000000, current: 600000, deadlineMonths: 10, category: 'savings', priority: 'low' },
      { name: 'Pay Off Student Loan', target: 800000, current: 350000, deadlineMonths: 5, category: 'debt', priority: 'high' },
      { name: 'Investment Portfolio', target: 5000000, current: 1500000, deadlineMonths: 24, category: 'investment', priority: 'medium' },
      { name: 'Kids Education Fund', target: 10000000, current: 2000000, deadlineMonths: 60, category: 'savings', priority: 'high' },
      { name: 'New Laptop', target: 250000, current: 180000, deadlineMonths: 2, category: 'electronics', priority: 'medium' },
    ];
    for (const g of goals) {
      const dl = new Date();
      dl.setMonth(dl.getMonth() + g.deadlineMonths);
      const deadline = `${dl.getFullYear()}-${String(dl.getMonth() + 1).padStart(2, '0')}-${String(dl.getDate()).padStart(2, '0')}`;
      await q(
        `INSERT INTO financial_goals (household_id, user_id, name, target_amount, current_amount, deadline, category, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [hhId, ADMIN_ID, g.name, g.target, g.current, deadline, g.category, g.priority]
      );
    }
    console.log(`✓ ${goals.length} financial goals created`);

    await client.query('COMMIT');
    console.log('\n=== Seed complete! ===');
    console.log(`Household: ${HOUSEHOLD.name}`);
    console.log(`Login: admin@admin.com`);
    console.log(`Expenses: ${expenseCount}`);
    console.log(`Income: ${incomeCount}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
