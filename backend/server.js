const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
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

loadEnv();

const PORT = Number(process.env.PORT || 4000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

function serializeGoal(goal) {
  return {
    ...goal,
    target_amount: Number(goal.target_amount),
    current_amount: Number(goal.current_amount || 0),
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function getUserId(req) {
  return req.headers['x-user-id'];
}

function idFromPath(pathname, basePath) {
  if (!pathname.startsWith(`${basePath}/`)) {
    return null;
  }

  const raw = pathname.slice(basePath.length + 1);
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

async function ensureDemoUser() {
  const passwordHash = hashPassword('demo123');
  const users = await query(
    `INSERT INTO users (email, full_name, password_hash, currency, created_at)
     VALUES ('demo@example.com', 'Demo Household', $1, 'USD', NOW())
     ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
     RETURNING id, email`,
    [passwordHash]
  );
  const userId = users[0].id;

  const expenseCategories = [
    ['Groceries', 'shopping-cart', '#ef4444'],
    ['Transport', 'car', '#f97316'],
    ['Rent', 'home', '#8b5cf6'],
    ['Utilities', 'zap', '#06b6d4'],
    ['Health', 'heart', '#ec4899'],
  ];
  const incomeCategories = [
    ['Salary', 'briefcase', '#22c55e'],
    ['Freelance', 'laptop', '#14b8a6'],
  ];

  for (const [name, icon, color] of expenseCategories) {
    await query(
      `INSERT INTO categories (user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, 'expense')
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [userId, name, icon, color]
    );
  }

  for (const [name, icon, color] of incomeCategories) {
    await query(
      `INSERT INTO categories (user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, 'income')
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [userId, name, icon, color]
    );
  }

  const existingExpenses = await query('SELECT id FROM expenses WHERE user_id = $1 LIMIT 1', [userId]);
  if (existingExpenses.length === 0) {
    const categories = await query('SELECT id, name, type FROM categories WHERE user_id = $1', [userId]);
    const categoryId = (name, type) => categories.find((category) => category.name === name && category.type === type)?.id;

    await query(
      `INSERT INTO income (user_id, category_id, amount, description, date, source)
       VALUES ($1, $2, 5200, 'Monthly salary', CURRENT_DATE, 'Employer')`,
      [userId, categoryId('Salary', 'income')]
    );
    await query(
      `INSERT INTO expenses (user_id, category_id, amount, description, date, payment_method)
       VALUES
       ($1, $2, 420, 'Weekly groceries', CURRENT_DATE, 'Debit Card'),
       ($1, $3, 1200, 'Monthly rent', CURRENT_DATE, 'Bank Transfer'),
       ($1, $4, 95, 'Electricity and water', CURRENT_DATE, 'Debit Order')`,
      [userId, categoryId('Groceries', 'expense'), categoryId('Rent', 'expense'), categoryId('Utilities', 'expense')]
    );
    await query(
      `INSERT INTO budgets (user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
       VALUES ($1, $2, 600, 'monthly', 80, DATE_TRUNC('month', CURRENT_DATE)::date)`,
      [userId, categoryId('Groceries', 'expense')]
    );
    await query(
      `INSERT INTO financial_goals (user_id, name, target_amount, current_amount, deadline, category, priority)
       VALUES ($1, 'Emergency fund', 3000, 850, CURRENT_DATE + INTERVAL '6 months', 'savings', 'high')`,
      [userId]
    );
  }

  return users[0];
}

async function seedDefaultCategories(userId) {
  const defaults = [
    ['Groceries', 'shopping-cart', '#ef4444', 'expense'],
    ['Transport', 'car', '#f97316', 'expense'],
    ['Rent', 'home', '#8b5cf6', 'expense'],
    ['Utilities', 'zap', '#06b6d4', 'expense'],
    ['Health', 'heart', '#ec4899', 'expense'],
    ['Salary', 'briefcase', '#22c55e', 'income'],
    ['Freelance', 'laptop', '#14b8a6', 'income'],
  ];

  for (const [name, icon, color, type] of defaults) {
    await query(
      `INSERT INTO categories (user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, name, type) DO NOTHING`,
      [userId, name, icon, color, type]
    );
  }
}

async function handleAuth(req, res, pathname) {
  const body = await readJson(req);

  if (pathname === '/api/auth/demo') {
    const user = await ensureDemoUser();
    return sendJson(res, 200, {
      userId: user.id,
      email: user.email,
      message: 'Demo account ready',
    });
  }

  if (pathname === '/api/auth/register') {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return sendJson(res, 400, { message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { message: 'Password must be at least 6 characters' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return sendJson(res, 409, { message: 'Email already registered' });
    }

    const rows = await query(
      `INSERT INTO users (email, full_name, password_hash, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, email`,
      [email, name, hashPassword(password)]
    );
    await seedDefaultCategories(rows[0].id);

    return sendJson(res, 201, {
      userId: rows[0].id,
      email: rows[0].email,
      fullName: name,
      message: 'Registration successful',
    });
  }

  if (pathname === '/api/auth/login') {
    const { email, password } = body;
    if (!email || !password) {
      return sendJson(res, 400, { message: 'Email and password are required' });
    }

    const rows = await query(
      'SELECT id, email, full_name, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0 || rows[0].password_hash !== hashPassword(password)) {
      return sendJson(res, 401, { message: 'Invalid email or password' });
    }

    return sendJson(res, 200, {
      userId: rows[0].id,
      email: rows[0].email,
      fullName: rows[0].full_name,
      message: 'Login successful',
    });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

async function handleProfile(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  if (req.method === 'GET') {
    const rows = await query(
      'SELECT id, email, full_name, currency, theme, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return sendJson(res, 404, { success: false, error: 'User not found' });
    }
    return sendJson(res, 200, { success: true, data: rows[0] });
  }

  const { full_name, email, currency, theme, password } = await readJson(req);
  const updates = [];
  const params = [];

  for (const [column, value] of [
    ['full_name', full_name],
    ['email', email],
    ['currency', currency],
    ['theme', theme],
  ]) {
    if (value !== undefined && value !== '') {
      params.push(value);
      updates.push(`${column} = $${params.length}`);
    }
  }

  if (password) {
    if (password.length < 6) {
      return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters' });
    }
    params.push(hashPassword(password));
    updates.push(`password_hash = $${params.length}`);
  }

  if (updates.length === 0) {
    return sendJson(res, 400, { success: false, error: 'No profile changes supplied' });
  }

  params.push(userId);
  const rows = await query(
    `UPDATE users
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${params.length}
     RETURNING id, email, full_name, currency, theme, created_at, updated_at`,
    params
  );
  return sendJson(res, 200, { success: true, data: rows[0], message: 'Profile updated successfully' });
}

async function handleCategories(req, res, url) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  if (req.method === 'GET') {
    const type = url.searchParams.get('type');
    const params = [userId];
    let sql = 'SELECT * FROM categories WHERE user_id = $1';

    if (type) {
      params.push(type);
      sql += ' AND type = $2';
    }

    const rows = await query(`${sql} ORDER BY name ASC`, params);
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'DELETE') {
    const id = idFromPath(url.pathname, '/api/categories');
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Category ID required' });
    }
    const rows = await query('DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Category deleted successfully' : 'Category not found',
    });
  }

  const { name, icon, color, type } = await readJson(req);
  if (!name || !type) {
    return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  }
  if (!['expense', 'income'].includes(type)) {
    return sendJson(res, 400, { success: false, error: 'Invalid category type' });
  }

  const rows = await query(
    `INSERT INTO categories (user_id, name, icon, color, type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, name, icon || 'tag', color || '#10b981', type]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Category created successfully' });
}

async function handleTransactions(req, res, url, table) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  if (req.method === 'GET') {
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const categoryId = url.searchParams.get('categoryId');
    const params = [userId];
    let sql = `SELECT * FROM ${table} WHERE user_id = $1`;

    if (month && year) {
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
      sql += ` AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $${params.length}::date)`;
    }

    if (categoryId) {
      params.push(categoryId);
      sql += ` AND category_id = $${params.length}`;
    }

    const rows = await query(`${sql} ORDER BY date DESC`, params);
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'DELETE') {
    const id = idFromPath(url.pathname, `/api/${table}`);
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Transaction ID required' });
    }
    const rows = await query(`DELETE FROM ${table} WHERE id = $1 AND user_id = $2 RETURNING id`, [id, userId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Transaction deleted successfully' : 'Transaction not found',
    });
  }

  if (req.method === 'PATCH') {
    const id = idFromPath(url.pathname, `/api/${table}`);
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Transaction ID required' });
    }

    const body = await readJson(req);
    const allowedFields = table === 'expenses'
      ? ['category_id', 'amount', 'description', 'date', 'payment_method', 'notes']
      : ['category_id', 'amount', 'description', 'date', 'source', 'notes'];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        params.push(body[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      return sendJson(res, 400, { success: false, error: 'No changes supplied' });
    }

    params.push(id, userId);
    const rows = await query(
      `UPDATE ${table}
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND user_id = $${params.length}
       RETURNING *`,
      params
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0],
      message: rows.length ? 'Transaction updated successfully' : 'Transaction not found',
    });
  }

  const body = await readJson(req);
  const { category_id, amount, description, date, notes } = body;
  if (!category_id || !amount || !date) {
    return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  }

  if (table === 'expenses') {
    const rows = await query(
      `INSERT INTO expenses (user_id, category_id, amount, description, date, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, category_id, amount, description, date, body.payment_method, notes]
    );
    return sendJson(res, 201, { success: true, data: rows[0], message: 'Expense created successfully' });
  }

  const rows = await query(
    `INSERT INTO income (user_id, category_id, amount, description, date, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, category_id, amount, description, date, body.source, notes]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Income recorded successfully' });
}

async function handleBudgets(req, res, url) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT b.*,
        COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.user_id = b.user_id
            AND e.category_id = b.category_id
            AND e.date >= b.period_start_date
            AND (
              (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
              (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
              (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
            )
        ), 0) AS spent_amount
       FROM budgets b
       WHERE b.user_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'DELETE') {
    const id = idFromPath(url.pathname, '/api/budgets');
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Budget ID required' });
    }
    const rows = await query(
      'UPDATE budgets SET is_active = false, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Budget deleted successfully' : 'Budget not found',
    });
  }

  const { category_id, limit_amount, period, alert_threshold, period_start_date } = await readJson(req);
  if (!category_id || !limit_amount || !period) {
    return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  }
  if (!['monthly', 'yearly', 'weekly'].includes(period)) {
    return sendJson(res, 400, { success: false, error: 'Invalid period' });
  }

  const rows = await query(
    `INSERT INTO budgets (user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, category_id, limit_amount, period, alert_threshold || 80, period_start_date || new Date().toISOString().split('T')[0]]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Budget created successfully' });
}

async function handleGoals(req, res, url) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  if (req.method === 'GET') {
    const rows = await query(
      'SELECT * FROM financial_goals WHERE user_id = $1 ORDER BY deadline ASC',
      [userId]
    );
    return sendJson(res, 200, { success: true, data: rows.map(serializeGoal) });
  }

  if (req.method === 'PATCH') {
    const id = idFromPath(url.pathname, '/api/goals');
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Goal ID required' });
    }
    const { current_amount, is_completed } = await readJson(req);
    const rows = await query(
      `UPDATE financial_goals
       SET current_amount = COALESCE($1, current_amount),
           is_completed = COALESCE($2, is_completed),
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [current_amount, is_completed, id, userId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0] && serializeGoal(rows[0]),
      message: rows.length ? 'Goal updated successfully' : 'Goal not found',
    });
  }

  if (req.method === 'DELETE') {
    const id = idFromPath(url.pathname, '/api/goals');
    if (!id) {
      return sendJson(res, 400, { success: false, error: 'Goal ID required' });
    }
    const rows = await query('DELETE FROM financial_goals WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Goal deleted successfully' : 'Goal not found',
    });
  }

  const { name, target_amount, deadline, category, priority, current_amount } = await readJson(req);
  if (!name || !target_amount) {
    return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  }

  const rows = await query(
    `INSERT INTO financial_goals (user_id, name, target_amount, current_amount, deadline, category, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, name, target_amount, current_amount || 0, deadline || null, category, priority || 'medium']
  );
  return sendJson(res, 201, { success: true, data: serializeGoal(rows[0]), message: 'Goal created successfully' });
}

async function handleReports(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  const rows = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM income WHERE user_id = $1), 0) AS total_income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = $1), 0) AS total_expenses,
      COALESCE((SELECT SUM(target_amount - current_amount) FROM financial_goals WHERE user_id = $1 AND is_completed = false), 0) AS remaining_goals,
      (
        SELECT COALESCE(json_agg(row_to_json(category_totals)), '[]'::json)
        FROM (
          SELECT c.name, c.color, COALESCE(SUM(e.amount), 0) AS amount
          FROM categories c
          LEFT JOIN expenses e ON e.category_id = c.id AND e.user_id = c.user_id
          WHERE c.user_id = $1 AND c.type = 'expense'
          GROUP BY c.name, c.color
          ORDER BY amount DESC
        ) category_totals
      ) AS category_totals`,
    [userId]
  );

  return sendJson(res, 200, { success: true, data: rows[0] });
}

async function handleAlerts(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    return sendJson(res, 401, { success: false, error: 'User ID required' });
  }

  const rows = await query(
    `SELECT b.id, c.name AS category_name, b.limit_amount, b.alert_threshold,
      COALESCE(SUM(e.amount), 0) AS spent_amount
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN expenses e ON e.user_id = b.user_id
       AND e.category_id = b.category_id
       AND e.date >= b.period_start_date
       AND (
         (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
         (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
         (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
       )
     WHERE b.user_id = $1 AND b.is_active = true
     GROUP BY b.id, c.name
     HAVING CASE WHEN b.limit_amount > 0 THEN (COALESCE(SUM(e.amount), 0) / b.limit_amount) * 100 ELSE 0 END >= b.alert_threshold
     ORDER BY spent_amount DESC`,
    [userId]
  );

  return sendJson(res, 200, { success: true, data: rows });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  try {
    if (req.method === 'POST' && url.pathname.startsWith('/api/auth/')) {
      return await handleAuth(req, res, url.pathname);
    }
    if (url.pathname === '/api/profile' && ['GET', 'PATCH'].includes(req.method)) {
      return await handleProfile(req, res);
    }
    if ((url.pathname === '/api/categories' || url.pathname.startsWith('/api/categories/')) && ['GET', 'POST', 'DELETE'].includes(req.method)) {
      return await handleCategories(req, res, url);
    }
    if ((url.pathname === '/api/expenses' || url.pathname.startsWith('/api/expenses/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleTransactions(req, res, url, 'expenses');
    }
    if ((url.pathname === '/api/income' || url.pathname.startsWith('/api/income/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleTransactions(req, res, url, 'income');
    }
    if ((url.pathname === '/api/budgets' || url.pathname.startsWith('/api/budgets/')) && ['GET', 'POST', 'DELETE'].includes(req.method)) {
      return await handleBudgets(req, res, url);
    }
    if ((url.pathname === '/api/goals' || url.pathname.startsWith('/api/goals/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleGoals(req, res, url);
    }
    if (url.pathname === '/api/reports' && req.method === 'GET') {
      return await handleReports(req, res);
    }
    if (url.pathname === '/api/alerts' && req.method === 'GET') {
      return await handleAlerts(req, res);
    }

    return sendJson(res, 404, { message: 'Not found' });
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 400, { success: false, error: 'Record already exists' });
    }

    console.error(error);
    return sendJson(res, 500, { success: false, error: 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
