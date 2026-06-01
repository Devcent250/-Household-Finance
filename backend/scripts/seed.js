/**
 * Seed script — inserts realistic dummy data for a user.
 * Run with:  node scripts/seed.js              (seeds demo@example.com, id=1)
 *            node scripts/seed.js --userId 2   (seeds any existing user by id)
 *            node scripts/seed.js --all        (seeds ALL users in the database)
 *
 * Safe to re-run: clears existing data for the target user(s) first, then re-inserts.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

// ─── env loader ──────────────────────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const sep = trimmed.indexOf('=');
        if (sep === -1) continue;
        const key = trimmed.slice(0, sep).trim();
        const val = trimmed.slice(sep + 1).trim();
        if (key && process.env[key] === undefined) process.env[key] = val;
    }
}

function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw).digest('hex');
}

/**
 * Build a YYYY-MM-DD string for a given year/month (1-based) and day.
 * If day > days-in-month, clamps to last day of month.
 */
function ymd(year, month, day) {
    const maxDay = new Date(year, month, 0).getDate(); // day=0 of next month = last day of this month
    const d = Math.min(day, maxDay);
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Returns dates relative to today's local date.
 * monthOffset=0 → current month, monthOffset=-1 → last month, etc.
 * day = day-of-month to use.
 */
function dateFor(monthOffset, day) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-based
    const targetMonth = month + monthOffset;
    // Normalise month overflow/underflow
    const d = new Date(year, targetMonth - 1, 1);
    return ymd(d.getFullYear(), d.getMonth() + 1, day);
}

// ─── seed data ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
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
];

const INCOME_CATEGORIES = [
    { name: 'Salary', icon: 'briefcase', color: '#22c55e' },
    { name: 'Freelance', icon: 'laptop', color: '#14b8a6' },
    { name: 'Investment', icon: 'trending-up', color: '#f59e0b' },
    { name: 'Rental', icon: 'building', color: '#6366f1' },
];

// Each expense: { category, amount, description, mo (month offset 0=current), day, payment_method }
const EXPENSES = [
    // ── Current month (mo=0) ─────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: 0, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 12500, description: 'Weekly shop – Woolworths', mo: 0, day: 1, payment_method: 'Debit Card' },
    { category: 'Transport', amount: 8000, description: 'Fuel top-up', mo: 0, day: 1, payment_method: 'Credit Card' },
    { category: 'Utilities', amount: 9800, description: 'Electricity & water', mo: 0, day: 1, payment_method: 'Debit Order' },
    { category: 'Dining Out', amount: 7500, description: 'Dinner with family', mo: 0, day: 1, payment_method: 'Cash' },
    { category: 'Subscriptions', amount: 5000, description: 'Netflix subscription', mo: 0, day: 1, payment_method: 'Credit Card' },
    { category: 'Subscriptions', amount: 5000, description: 'Spotify subscription', mo: 0, day: 1, payment_method: 'Credit Card' },
    { category: 'Groceries', amount: 11000, description: 'Weekly shop – Pick n Pay', mo: 0, day: 1, payment_method: 'Debit Card' },
    { category: 'Health', amount: 6500, description: 'Pharmacy – vitamins', mo: 0, day: 1, payment_method: 'Cash' },
    { category: 'Transport', amount: 5500, description: 'Uber rides', mo: 0, day: 1, payment_method: 'Digital Wallet' },
    { category: 'Entertainment', amount: 9000, description: 'Cinema & popcorn', mo: 0, day: 1, payment_method: 'Credit Card' },
    { category: 'Groceries', amount: 10500, description: 'Weekly shop – Checkers', mo: 0, day: 1, payment_method: 'Debit Card' },
    { category: 'Dining Out', amount: 6000, description: 'Lunch with colleagues', mo: 0, day: 1, payment_method: 'Cash' },
    { category: 'Clothing', amount: 18000, description: 'Winter jacket', mo: 0, day: 1, payment_method: 'Credit Card' },
    { category: 'Education', amount: 15000, description: 'Online course – Udemy', mo: 0, day: 1, payment_method: 'Credit Card' },

    // ── 1 month ago (mo=-1) ──────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: -1, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 11500, description: 'Weekly shop', mo: -1, day: 3, payment_method: 'Debit Card' },
    { category: 'Transport', amount: 7500, description: 'Fuel', mo: -1, day: 5, payment_method: 'Credit Card' },
    { category: 'Utilities', amount: 10500, description: 'Electricity & water', mo: -1, day: 6, payment_method: 'Debit Order' },
    { category: 'Dining Out', amount: 8500, description: 'Restaurant – anniversary', mo: -1, day: 8, payment_method: 'Credit Card' },
    { category: 'Health', amount: 22000, description: 'Dentist visit', mo: -1, day: 10, payment_method: 'Cash' },
    { category: 'Groceries', amount: 10000, description: 'Weekly shop', mo: -1, day: 12, payment_method: 'Debit Card' },
    { category: 'Subscriptions', amount: 5500, description: 'Cloud storage plan', mo: -1, day: 13, payment_method: 'Credit Card' },
    { category: 'Entertainment', amount: 12000, description: 'Concert tickets', mo: -1, day: 15, payment_method: 'Credit Card' },
    { category: 'Groceries', amount: 11200, description: 'Weekly shop', mo: -1, day: 18, payment_method: 'Debit Card' },
    { category: 'Transport', amount: 6000, description: 'Taxi & parking', mo: -1, day: 20, payment_method: 'Cash' },
    { category: 'Clothing', amount: 14000, description: 'Shoes & accessories', mo: -1, day: 22, payment_method: 'Credit Card' },

    // ── 2 months ago (mo=-2) ─────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: -2, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 13000, description: 'Weekly shop', mo: -2, day: 3, payment_method: 'Debit Card' },
    { category: 'Utilities', amount: 11200, description: 'Electricity & water', mo: -2, day: 5, payment_method: 'Debit Order' },
    { category: 'Transport', amount: 9000, description: 'Fuel & toll fees', mo: -2, day: 7, payment_method: 'Credit Card' },
    { category: 'Health', amount: 18000, description: 'GP consultation', mo: -2, day: 8, payment_method: 'Cash' },
    { category: 'Dining Out', amount: 9500, description: 'Birthday dinner', mo: -2, day: 10, payment_method: 'Credit Card' },
    { category: 'Groceries', amount: 10800, description: 'Weekly shop', mo: -2, day: 12, payment_method: 'Debit Card' },
    { category: 'Education', amount: 35000, description: 'Professional certification', mo: -2, day: 14, payment_method: 'Bank Transfer' },
    { category: 'Entertainment', amount: 7000, description: 'Streaming & gaming', mo: -2, day: 16, payment_method: 'Digital Wallet' },
    { category: 'Groceries', amount: 12000, description: 'Weekly shop', mo: -2, day: 19, payment_method: 'Debit Card' },
    { category: 'Subscriptions', amount: 5000, description: 'Netflix subscription', mo: -2, day: 20, payment_method: 'Credit Card' },

    // ── 3 months ago (mo=-3) ─────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: -3, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 13500, description: 'Weekly shop', mo: -3, day: 4, payment_method: 'Debit Card' },
    { category: 'Utilities', amount: 9500, description: 'Electricity & water', mo: -3, day: 6, payment_method: 'Debit Order' },
    { category: 'Transport', amount: 8500, description: 'Fuel', mo: -3, day: 8, payment_method: 'Credit Card' },
    { category: 'Clothing', amount: 22000, description: 'Seasonal wardrobe update', mo: -3, day: 10, payment_method: 'Credit Card' },
    { category: 'Dining Out', amount: 7000, description: 'Lunch out', mo: -3, day: 12, payment_method: 'Cash' },
    { category: 'Health', amount: 25000, description: 'Optometrist & glasses', mo: -3, day: 14, payment_method: 'Credit Card' },
    { category: 'Groceries', amount: 11000, description: 'Weekly shop', mo: -3, day: 17, payment_method: 'Debit Card' },
    { category: 'Entertainment', amount: 8500, description: 'Theme park outing', mo: -3, day: 19, payment_method: 'Cash' },
    { category: 'Subscriptions', amount: 5000, description: 'Spotify subscription', mo: -3, day: 20, payment_method: 'Credit Card' },

    // ── 4 months ago (mo=-4) ─────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: -4, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 12000, description: 'Weekly shop', mo: -4, day: 5, payment_method: 'Debit Card' },
    { category: 'Utilities', amount: 8800, description: 'Electricity & water', mo: -4, day: 7, payment_method: 'Debit Order' },
    { category: 'Transport', amount: 7000, description: 'Fuel', mo: -4, day: 9, payment_method: 'Credit Card' },
    { category: 'Dining Out', amount: 14000, description: "Valentine's dinner", mo: -4, day: 14, payment_method: 'Credit Card' },
    { category: 'Health', amount: 9000, description: 'Pharmacy', mo: -4, day: 13, payment_method: 'Cash' },
    { category: 'Groceries', amount: 10500, description: 'Weekly shop', mo: -4, day: 16, payment_method: 'Debit Card' },
    { category: 'Education', amount: 28000, description: 'Books & study materials', mo: -4, day: 18, payment_method: 'Bank Transfer' },
    { category: 'Entertainment', amount: 6500, description: 'Movie night', mo: -4, day: 20, payment_method: 'Cash' },
    { category: 'Subscriptions', amount: 5000, description: 'Netflix subscription', mo: -4, day: 21, payment_method: 'Credit Card' },

    // ── 5 months ago (mo=-5) ─────────────────────────────────────────────────
    { category: 'Rent', amount: 85000, description: 'Monthly rent', mo: -5, day: 1, payment_method: 'Bank Transfer' },
    { category: 'Groceries', amount: 14000, description: 'Weekly shop', mo: -5, day: 6, payment_method: 'Debit Card' },
    { category: 'Utilities', amount: 13000, description: 'Electricity & water', mo: -5, day: 8, payment_method: 'Debit Order' },
    { category: 'Transport', amount: 9500, description: 'Fuel & road trip', mo: -5, day: 10, payment_method: 'Credit Card' },
    { category: 'Dining Out', amount: 11000, description: 'New Year dinner', mo: -5, day: 2, payment_method: 'Cash' },
    { category: 'Clothing', amount: 30000, description: 'New Year outfit', mo: -5, day: 3, payment_method: 'Credit Card' },
    { category: 'Health', amount: 12000, description: 'Annual check-up', mo: -5, day: 15, payment_method: 'Cash' },
    { category: 'Groceries', amount: 13500, description: 'Weekly shop', mo: -5, day: 18, payment_method: 'Debit Card' },
    { category: 'Entertainment', amount: 16000, description: 'New Year party supplies', mo: -5, day: 20, payment_method: 'Credit Card' },
    { category: 'Subscriptions', amount: 5000, description: 'Spotify subscription', mo: -5, day: 22, payment_method: 'Credit Card' },
];

// Each income: { category, amount, description, mo, day, source }
const INCOME = [
    // Current month
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: 0, day: 1, source: 'Employer' },
    { category: 'Freelance', amount: 85000, description: 'Web design project', mo: 0, day: 1, source: 'Client A' },
    { category: 'Investment', amount: 12000, description: 'Dividend payout', mo: 0, day: 1, source: 'Stock portfolio' },
    // 1 month ago
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: -1, day: 1, source: 'Employer' },
    { category: 'Freelance', amount: 120000, description: 'Logo & branding project', mo: -1, day: 10, source: 'Client B' },
    { category: 'Rental', amount: 55000, description: 'Rental income – garage', mo: -1, day: 15, source: 'Tenant' },
    // 2 months ago
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: -2, day: 1, source: 'Employer' },
    { category: 'Freelance', amount: 65000, description: 'Content writing', mo: -2, day: 10, source: 'Client C' },
    { category: 'Investment', amount: 9500, description: 'Dividend payout', mo: -2, day: 15, source: 'Stock portfolio' },
    { category: 'Rental', amount: 55000, description: 'Rental income – garage', mo: -2, day: 18, source: 'Tenant' },
    // 3 months ago
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: -3, day: 1, source: 'Employer' },
    { category: 'Freelance', amount: 200000, description: 'Mobile app UI project', mo: -3, day: 10, source: 'Client D' },
    { category: 'Rental', amount: 55000, description: 'Rental income – garage', mo: -3, day: 18, source: 'Tenant' },
    // 4 months ago
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: -4, day: 1, source: 'Employer' },
    { category: 'Investment', amount: 20000, description: 'ETF dividend', mo: -4, day: 10, source: 'Investment account' },
    { category: 'Rental', amount: 55000, description: 'Rental income – garage', mo: -4, day: 18, source: 'Tenant' },
    // 5 months ago
    { category: 'Salary', amount: 450000, description: 'Monthly salary', mo: -5, day: 1, source: 'Employer' },
    { category: 'Freelance', amount: 75000, description: 'Year-end consulting', mo: -5, day: 12, source: 'Client E' },
    { category: 'Rental', amount: 55000, description: 'Rental income – garage', mo: -5, day: 18, source: 'Tenant' },
    { category: 'Investment', amount: 15000, description: 'Year-end dividend', mo: -5, day: 22, source: 'Stock portfolio' },
];

// Budgets — limits scaled to match new amounts
const BUDGETS = [
    { category: 'Groceries', limit: 55000, period: 'monthly', alert: 80 },
    { category: 'Transport', limit: 30000, period: 'monthly', alert: 75 },
    { category: 'Dining Out', limit: 25000, period: 'monthly', alert: 80 },
    { category: 'Entertainment', limit: 20000, period: 'monthly', alert: 85 },
    { category: 'Utilities', limit: 15000, period: 'monthly', alert: 90 },
    { category: 'Clothing', limit: 35000, period: 'monthly', alert: 80 },
    { category: 'Subscriptions', limit: 12000, period: 'monthly', alert: 90 },
    { category: 'Health', limit: 30000, period: 'monthly', alert: 80 },
];

// Financial goals — deadlineMonths = months from now
const GOALS = [
    { name: 'Emergency Fund', target: 1000000, current: 320000, deadlineMonths: 6, category: 'savings', priority: 'high' },
    { name: 'Holiday to Europe', target: 500000, current: 180000, deadlineMonths: 4, category: 'travel', priority: 'medium' },
    { name: 'New Laptop', target: 150000, current: 90000, deadlineMonths: 2, category: 'electronics', priority: 'medium' },
    { name: 'Pay Off Credit Card', target: 300000, current: 120000, deadlineMonths: 3, category: 'debt', priority: 'high' },
    { name: 'Home Deposit', target: 5000000, current: 850000, deadlineMonths: 24, category: 'property', priority: 'high' },
    { name: 'Investment Portfolio', target: 2000000, current: 420000, deadlineMonths: 12, category: 'investment', priority: 'low' },
];

// ─── seed one user ───────────────────────────────────────────────────────────

async function seedUser(client, userId, label) {
    console.log(`\n── Seeding user id=${userId} (${label}) ──`);

    const allCategories = [
        ...EXPENSE_CATEGORIES.map(c => ({ ...c, type: 'expense' })),
        ...INCOME_CATEGORIES.map(c => ({ ...c, type: 'income' })),
    ];

    for (const cat of allCategories) {
        await client.query(
            `INSERT INTO categories (user_id, name, icon, color, type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, name, type) DO UPDATE SET icon = EXCLUDED.icon, color = EXCLUDED.color`,
            [userId, cat.name, cat.icon, cat.color, cat.type]
        );
    }
    console.log(`  ✓ ${allCategories.length} categories upserted`);

    const catRows = await client.query(
        'SELECT id, name, type FROM categories WHERE user_id = $1',
        [userId]
    );
    const catId = (name, type) => {
        const row = catRows.rows.find(r => r.name === name && r.type === type);
        if (!row) throw new Error(`Category not found: ${name} (${type})`);
        return row.id;
    };

    await client.query('DELETE FROM expenses WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM income WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM financial_goals WHERE user_id = $1', [userId]);
    console.log('  ✓ Cleared existing data');

    for (const e of EXPENSES) {
        await client.query(
            `INSERT INTO expenses (user_id, category_id, amount, description, date, payment_method, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, catId(e.category, 'expense'), e.amount, e.description, dateFor(e.mo, e.day), e.payment_method, null]
        );
    }
    console.log(`  ✓ ${EXPENSES.length} expenses inserted`);

    for (const i of INCOME) {
        await client.query(
            `INSERT INTO income (user_id, category_id, amount, description, date, source)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, catId(i.category, 'income'), i.amount, i.description, dateFor(i.mo, i.day), i.source]
        );
    }
    console.log(`  ✓ ${INCOME.length} income records inserted`);

    // period_start_date = first day of current local month
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    for (const b of BUDGETS) {
        await client.query(
            `INSERT INTO budgets (user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, catId(b.category, 'expense'), b.limit, b.period, b.alert, periodStart]
        );
    }
    console.log(`  ✓ ${BUDGETS.length} budgets inserted`);

    for (const g of GOALS) {
        const dl = new Date();
        dl.setMonth(dl.getMonth() + g.deadlineMonths);
        const deadline = `${dl.getFullYear()}-${String(dl.getMonth() + 1).padStart(2, '0')}-${String(dl.getDate()).padStart(2, '0')}`;
        await client.query(
            `INSERT INTO financial_goals (user_id, name, target_amount, current_amount, deadline, category, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, g.name, g.target, g.current, deadline, g.category, g.priority]
        );
    }
    console.log(`  ✓ ${GOALS.length} financial goals inserted`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
    loadEnv();

    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set. Create backend/.env first.');
    }

    const args = process.argv.slice(2);
    const userIdFlagIdx = args.indexOf('--userId');
    const seedAll = args.includes('--all');

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        await client.query('BEGIN');

        if (seedAll) {
            const users = await client.query('SELECT id, email FROM users ORDER BY id');
            if (users.rows.length === 0) console.log('No users found.');
            for (const u of users.rows) await seedUser(client, u.id, u.email);
        } else if (userIdFlagIdx !== -1) {
            const targetId = Number(args[userIdFlagIdx + 1]);
            if (!targetId) throw new Error('--userId requires a numeric value, e.g. --userId 2');
            const rows = await client.query('SELECT id, email FROM users WHERE id = $1', [targetId]);
            if (rows.rows.length === 0) throw new Error(`No user found with id=${targetId}`);
            await seedUser(client, rows.rows[0].id, rows.rows[0].email);
        } else {
            const passwordHash = hashPassword('demo123');
            const userRes = await client.query(
                `INSERT INTO users (email, full_name, password_hash, currency, created_at)
                 VALUES ('demo@example.com', 'Demo Household', $1, 'USD', NOW())
                 ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                 RETURNING id, email`,
                [passwordHash]
            );
            const u = userRes.rows[0];
            console.log(`✓ Demo user ready (id=${u.id})`);
            await seedUser(client, u.id, u.email);
        }

        await client.query('COMMIT');
        console.log('\n🎉 Seed complete!');
        if (!seedAll && userIdFlagIdx === -1) console.log('   Demo login: demo@example.com / demo123');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        await client.end();
    }
}

seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
