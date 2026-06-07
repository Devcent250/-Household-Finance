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

async function ensureSuperAdmin() {
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false`);
  const passwordHash = hashPassword('1234567890');
  const existing = await query("SELECT id FROM users WHERE email = 'admin@admin.com'");
  if (existing.length === 0) {
    const result = await query(
      `INSERT INTO users (email, full_name, password_hash, is_super_admin, created_at)
       VALUES ('admin@admin.com', 'Super Admin', $1, true, NOW())
       RETURNING id`,
      [passwordHash]
    );
    console.log(`Super-admin created (id=${result[0].id})`);
  } else {
    // Ensure existing admin@admin.com has super_admin flag
    await query("UPDATE users SET is_super_admin = true WHERE email = 'admin@admin.com'");
    console.log('Super-admin ensured');
  }
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
    'Access-Control-Allow-Headers': 'Content-Type, x-user-id, x-household-id',
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

  // Create or get existing household
  let householdId;
  const existingHousehold = await query(
    'SELECT id FROM households WHERE owner_id = $1 LIMIT 1',
    [userId]
  );
  if (existingHousehold.length > 0) {
    householdId = existingHousehold[0].id;
  } else {
    const h = await query(
      `INSERT INTO households (name, owner_id, currency) VALUES ('Demo Household', $1, 'USD') RETURNING id`,
      [userId]
    );
    householdId = h[0].id;
    const roles = await ensureDefaultRoles(householdId);
    await query(
      `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)
       ON CONFLICT (household_id, user_id) DO NOTHING`,
      [householdId, userId, roles.adminRoleId]
    );
  }

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
      `INSERT INTO categories (household_id, user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5, 'expense')
       ON CONFLICT (household_id, name, type) DO NOTHING`,
      [householdId, userId, name, icon, color]
    );
  }

  for (const [name, icon, color] of incomeCategories) {
    await query(
      `INSERT INTO categories (household_id, user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5, 'income')
       ON CONFLICT (household_id, name, type) DO NOTHING`,
      [householdId, userId, name, icon, color]
    );
  }

  const existingExpenses = await query('SELECT id FROM expenses WHERE household_id = $1 LIMIT 1', [householdId]);
  if (existingExpenses.length === 0) {
    const categories = await query('SELECT id, name, type FROM categories WHERE household_id = $1', [householdId]);
    const categoryId = (name, type) => categories.find((category) => category.name === name && category.type === type)?.id;

    await query(
      `INSERT INTO income (household_id, user_id, category_id, amount, description, date, source)
       VALUES ($1, $2, $3, 5200, 'Monthly salary', CURRENT_DATE, 'Employer')`,
      [householdId, userId, categoryId('Salary', 'income')]
    );
    await query(
      `INSERT INTO expenses (household_id, user_id, category_id, amount, description, date, payment_method)
       VALUES
       ($1, $2, $3, 420, 'Weekly groceries', CURRENT_DATE, 'Debit Card'),
       ($1, $2, $4, 1200, 'Monthly rent', CURRENT_DATE, 'Bank Transfer'),
       ($1, $2, $5, 95, 'Electricity and water', CURRENT_DATE, 'Debit Order')`,
      [householdId, userId, categoryId('Groceries', 'expense'), categoryId('Rent', 'expense'), categoryId('Utilities', 'expense')]
    );
    await query(
      `INSERT INTO budgets (household_id, user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
       VALUES ($1, $2, $3, 600, 'monthly', 80, DATE_TRUNC('month', CURRENT_DATE)::date)`,
      [householdId, userId, categoryId('Groceries', 'expense')]
    );
    await query(
      `INSERT INTO financial_goals (household_id, user_id, name, target_amount, current_amount, deadline, category, priority)
       VALUES ($1, $2, 'Emergency fund', 3000, 850, CURRENT_DATE + INTERVAL '6 months', 'savings', 'high')`,
      [householdId, userId]
    );
  }

  return users[0];
}

// ─── Multi-tenant helpers ─────────────────────────────────────────────

const ALL_PERMISSIONS = [
  'dashboard:view',
  'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'income:create', 'income:view', 'income:edit', 'income:delete',
  'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
  'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
  'categories:manage', 'reports:view', 'analytics:view',
  'members:manage', 'roles:manage', 'settings:manage',
];

async function getHouseholdContext(req) {
  const userId = getUserId(req);
  if (!userId) return null;

  let householdId = req.headers['x-household-id'];
  if (!householdId) {
    const rows = await query(
      'SELECT household_id FROM household_members WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (rows.length === 0) return null;
    householdId = String(rows[0].household_id);
  }

  const member = await query(
    `SELECT hm.role_id, hm.household_id, h.owner_id
     FROM household_members hm
     JOIN households h ON h.id = hm.household_id
     WHERE hm.household_id = $1 AND hm.user_id = $2`,
    [householdId, userId]
  );

  if (member.length === 0) return null;

  const isOwner = member[0].owner_id === Number(userId);
  const permissions = new Set();

  if (isOwner) {
    permissions.add('*');
  } else if (member[0].role_id) {
    const perms = await query(
      'SELECT permission_key FROM household_role_permissions WHERE role_id = $1',
      [member[0].role_id]
    );
    perms.forEach((p) => permissions.add(p.permission_key));
  }

  return {
    userId: Number(userId),
    householdId: member[0].household_id,
    roleId: member[0].role_id,
    isOwner,
    permissions,
  };
}

function requirePermission(context, permission) {
  if (!context) return false;
  return context.isOwner || context.permissions.has('*') || context.permissions.has(permission);
}

async function ensureDefaultRoles(householdId) {
  const existing = await query('SELECT id FROM household_roles WHERE household_id = $1 LIMIT 1', [householdId]);
  if (existing.length > 0) return;

  const superRole = await query(
    `INSERT INTO household_roles (household_id, name, description)
     VALUES ($1, 'Superadmin', 'Full access to all household features')
     RETURNING id`,
    [householdId]
  );

  for (const pk of ALL_PERMISSIONS) {
    await query(
      `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [superRole[0].id, pk]
    );
  }

  const adminRole = await query(
    `INSERT INTO household_roles (household_id, name, description)
     VALUES ($1, 'Admin', 'Full access to all household features')
     RETURNING id`,
    [householdId]
  );

  for (const pk of ALL_PERMISSIONS) {
    await query(
      `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [adminRole[0].id, pk]
    );
  }

  const memberRole = await query(
    `INSERT INTO household_roles (household_id, name, description)
     VALUES ($1, 'Member', 'Can view and record expenses and income')
     RETURNING id`,
    [householdId]
  );

  const memberPerms = [
    'dashboard:view',
    'expenses:create', 'expenses:view', 'expenses:edit',
    'income:create', 'income:view', 'income:edit',
    'goals:view', 'goals:edit',
    'budgets:view',
    'reports:view', 'analytics:view',
  ];
  for (const pk of memberPerms) {
    await query(
      `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
      [memberRole[0].id, pk]
    );
  }

  return { superRoleId: superRole[0].id, adminRoleId: adminRole[0].id, memberRoleId: memberRole[0].id };
}

// ─── Household handlers ───────────────────────────────────────────────

async function handleHouseholds(req, res) {
  const userId = getUserId(req);
  if (!userId) return sendJson(res, 401, { success: false, error: 'User ID required' });

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT h.*, hm.role_id, hr.name as role_name
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       LEFT JOIN household_roles hr ON hr.id = hm.role_id
       WHERE hm.user_id = $1
       ORDER BY h.created_at DESC`,
      [userId]
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'POST') {
    const { name, currency } = await readJson(req);
    if (!name) return sendJson(res, 400, { success: false, error: 'Household name required' });

    const rows = await query(
      `INSERT INTO households (name, owner_id, currency)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, userId, currency || 'USD']
    );

    const householdId = rows[0].id;
    const roles = await ensureDefaultRoles(householdId);

    // Super admin gets Superadmin role, others get Admin
    const isSuper = await isSuperAdmin(userId);
    const roleId = isSuper ? roles.superRoleId : roles.adminRoleId;

    await query(
      `INSERT INTO household_members (household_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [householdId, userId, roleId]
    );

    return sendJson(res, 201, { success: true, data: rows[0], message: 'Household created' });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

async function handleHouseholdPatch(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });
  if (!requirePermission(ctx, 'settings:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const id = url.pathname === '/api/households' ? ctx.householdId : idFromPath(url.pathname, '/api/households');
  if (!id) return sendJson(res, 400, { success: false, error: 'Household ID required' });

  const { name, currency } = await readJson(req);
  const updates = [];
  const params = [];

  for (const [col, val] of [['name', name], ['currency', currency]]) {
    if (val !== undefined && val !== '') {
      params.push(val);
      updates.push(`${col} = $${params.length}`);
    }
  }

  if (updates.length === 0) return sendJson(res, 400, { success: false, error: 'No changes' });

  params.push(id);
  const rows = await query(
    `UPDATE households SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params
  );
  return sendJson(res, 200, { success: true, data: rows[0] });
}

// ─── Member handlers ──────────────────────────────────────────────────

async function handleMembers(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    if (!requirePermission(ctx, 'members:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

    const rows = await query(
      `SELECT hm.id, hm.user_id, hm.role_id, hm.created_at AS joined_at,
              u.email, u.full_name,
              hr.name AS role_name
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       LEFT JOIN household_roles hr ON hr.id = hm.role_id
       WHERE hm.household_id = $1 AND u.is_super_admin = false
       ORDER BY hm.created_at ASC`,
      [ctx.householdId]
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (!requirePermission(ctx, 'members:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  if (req.method === 'POST') {
    const { email, full_name, password, role_id } = await readJson(req);
    if (!email || !full_name || !password) {
      return sendJson(res, 400, { success: false, error: 'email, full_name, and password required' });
    }
    if (password.length < 6) return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters' });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      const alreadyMember = await query(
        'SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2',
        [ctx.householdId, userId]
      );
      if (alreadyMember.length > 0) {
        return sendJson(res, 409, { success: false, error: 'User is already a member of this household' });
      }
    } else {
      const newUser = await query(
        `INSERT INTO users (email, full_name, password_hash, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [email, full_name, hashPassword(password)]
      );
      userId = newUser[0].id;
    }

    // If no role_id specified, assign default Member role
    let finalRoleId = role_id;
    if (!finalRoleId) {
      const defaultRole = await query(
        `SELECT id FROM household_roles WHERE household_id = $1 AND name = 'Member' LIMIT 1`,
        [ctx.householdId]
      );
      finalRoleId = defaultRole.length > 0 ? defaultRole[0].id : null;
    }

    await query(
      `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)`,
      [ctx.householdId, userId, finalRoleId]
    );

    return sendJson(res, 201, { success: true, message: 'Member added' });
  }

  if (req.method === 'DELETE') {
    const memberId = idFromPath(url.pathname, '/api/households/members');
    if (!memberId) return sendJson(res, 400, { success: false, error: 'Member ID required' });

    const member = await query(
      'SELECT user_id FROM household_members WHERE id = $1 AND household_id = $2',
      [memberId, ctx.householdId]
    );
    if (member.length === 0) return sendJson(res, 404, { success: false, error: 'Member not found' });
    if (member[0].user_id === ctx.userId) return sendJson(res, 400, { success: false, error: 'Cannot remove yourself' });

    await query('DELETE FROM household_members WHERE id = $1', [memberId]);
    return sendJson(res, 200, { success: true, message: 'Member removed' });
  }

  if (req.method === 'PATCH') {
    const memberId = idFromPath(url.pathname, '/api/households/members');
    if (!memberId) return sendJson(res, 400, { success: false, error: 'Member ID required' });

    const body = await readJson(req);

    // Update user fields if provided
    if (body.full_name || body.email) {
      const member = await query(
        'SELECT user_id FROM household_members WHERE id = $1 AND household_id = $2',
        [memberId, ctx.householdId]
      );
      if (member.length === 0) return sendJson(res, 404, { success: false, error: 'Member not found' });

      const updates = [];
      const params = [];
      let idx = 1;
      if (body.full_name) { updates.push(`full_name = $${idx++}`); params.push(body.full_name); }
      if (body.email) { updates.push(`email = $${idx++}`); params.push(body.email); }
      params.push(member[0].user_id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    }

    // Update role if provided
    if (body.role_id) {
      const role = await query(
        'SELECT id FROM household_roles WHERE id = $1 AND household_id = $2',
        [body.role_id, ctx.householdId]
      );
      if (role.length === 0) return sendJson(res, 400, { success: false, error: 'Role not found' });

      await query(
        'UPDATE household_members SET role_id = $1 WHERE id = $2 AND household_id = $3',
        [body.role_id, memberId, ctx.householdId]
      );
    }

    return sendJson(res, 200, { success: true, message: 'Member updated' });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

// ─── Role handlers ────────────────────────────────────────────────────

async function handleRoles(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT hr.*,
        COALESCE(
          (SELECT json_agg(hrp.permission_key) FROM household_role_permissions hrp WHERE hrp.role_id = hr.id),
          '[]'::json
        ) AS permissions
       FROM household_roles hr
       WHERE hr.household_id = $1
       ORDER BY hr.created_at ASC`,
      [ctx.householdId]
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (!requirePermission(ctx, 'roles:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  if (req.method === 'POST') {
    const { name, description, permissions } = await readJson(req);
    if (!name) return sendJson(res, 400, { success: false, error: 'Role name required' });

    const role = await query(
      `INSERT INTO household_roles (household_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [ctx.householdId, name, description || '']
    );

    if (Array.isArray(permissions)) {
      for (const pk of permissions) {
        if (ALL_PERMISSIONS.includes(pk)) {
          await query(
            `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [role[0].id, pk]
          );
        }
      }
    }

    return sendJson(res, 201, { success: true, data: role[0] });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

async function handleRoleById(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });
  if (!requirePermission(ctx, 'roles:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const roleId = idFromPath(url.pathname, '/api/households/roles');
  if (!roleId) return sendJson(res, 400, { success: false, error: 'Role ID required' });

  const role = await query(
    'SELECT * FROM household_roles WHERE id = $1 AND household_id = $2',
    [roleId, ctx.householdId]
  );
  if (role.length === 0) return sendJson(res, 404, { success: false, error: 'Role not found' });

  if (req.method === 'DELETE') {
    await query('DELETE FROM household_roles WHERE id = $1', [roleId]);
    return sendJson(res, 200, { success: true, message: 'Role deleted' });
  }

  if (req.method === 'PATCH') {
    const { name, description, permissions } = await readJson(req);

    if (name !== undefined || description !== undefined) {
      const updates = [];
      const params = [];
      if (name !== undefined) { params.push(name); updates.push(`name = $${params.length}`); }
      if (description !== undefined) { params.push(description); updates.push(`description = $${params.length}`); }
      params.push(roleId);
      await query(`UPDATE household_roles SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    if (Array.isArray(permissions)) {
      await query('DELETE FROM household_role_permissions WHERE role_id = $1', [roleId]);
      for (const pk of permissions) {
        if (ALL_PERMISSIONS.includes(pk)) {
          await query(
            `INSERT INTO household_role_permissions (role_id, permission_key) VALUES ($1, $2)`,
            [roleId, pk]
          );
        }
      }
    }

    return sendJson(res, 200, { success: true, message: 'Role updated' });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

async function handlePermissionsList(req, res) {
  return sendJson(res, 200, { success: true, data: ALL_PERMISSIONS });
}

async function handleMyPermissions(req, res) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });
  return sendJson(res, 200, {
    success: true,
    data: {
      userId: ctx.userId,
      householdId: ctx.householdId,
      isOwner: ctx.isOwner,
      isSuperAdmin: await isSuperAdmin(ctx.userId),
      permissions: Array.from(ctx.permissions),
    },
  });
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

  // Get user's household
  const member = await query(
    'SELECT household_id FROM household_members WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  const householdId = member.length > 0 ? member[0].household_id : null;

  for (const [name, icon, color, type] of defaults) {
    await query(
      `INSERT INTO categories (household_id, user_id, name, icon, color, type)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (household_id, name, type) DO NOTHING`,
      [householdId, userId, name, icon, color, type]
    );
  }
}

async function handleAuth(req, res, pathname) {
  const body = await readJson(req);

  if (pathname === '/api/auth/demo') {
    const user = await ensureDemoUser();
    let household = null;
    const memberships = await query(
      'SELECT hm.household_id, h.name AS household_name FROM household_members hm JOIN households h ON h.id = hm.household_id WHERE hm.user_id = $1 LIMIT 1',
      [user.id]
    );
    if (memberships.length > 0) household = memberships[0];
    return sendJson(res, 200, {
      userId: user.id,
      email: user.email,
      household: household ? { id: household.household_id, name: household.household_name } : null,
      isSuperAdmin: false,
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
    const userId = rows[0].id;

    return sendJson(res, 201, {
      userId,
      email: rows[0].email,
      fullName: name,
      household: null,
      isSuperAdmin: false,
      message: 'Registration successful',
    });
  }

  if (pathname === '/api/auth/login') {
    const { email, password } = body;
    if (!email || !password) {
      return sendJson(res, 400, { message: 'Email and password are required' });
    }

    const rows = await query(
      'SELECT id, email, full_name, password_hash, is_super_admin FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0 || rows[0].password_hash !== hashPassword(password)) {
      return sendJson(res, 401, { message: 'Invalid email or password' });
    }

    const userId = rows[0].id;
    const isSuperAdmin = rows[0].is_super_admin === true;
    let household = null;
    let permissions = [];
    let isOwner = false;
    let roleName = null;
    const memberships = await query(
      `SELECT hm.household_id, hm.role_id, h.name AS household_name, h.owner_id
       FROM household_members hm
       JOIN households h ON h.id = hm.household_id
       WHERE hm.user_id = $1 LIMIT 1`,
      [userId]
    );
    if (memberships.length > 0) {
      const m = memberships[0];
      household = { id: m.household_id, name: m.household_name };
      isOwner = m.owner_id === userId;
      if (m.role_id) {
        const roleData = await query(
          `SELECT hr.name, COALESCE(json_agg(hrp.permission_key) FILTER (WHERE hrp.permission_key IS NOT NULL), '[]') AS permissions
           FROM household_roles hr
           LEFT JOIN household_role_permissions hrp ON hrp.role_id = hr.id
           WHERE hr.id = $1
           GROUP BY hr.id, hr.name`,
          [m.role_id]
        );
        if (roleData.length > 0) {
          roleName = roleData[0].name;
          permissions = roleData[0].permissions || [];
        }
      }
    }

    return sendJson(res, 200, {
      userId,
      email: rows[0].email,
      fullName: rows[0].full_name,
      household,
      isSuperAdmin,
      permissions,
      isOwner,
      roleName,
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
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    if (!requirePermission(ctx, 'categories:manage') && !requirePermission(ctx, 'expenses:view')) {
      return sendJson(res, 403, { success: false, error: 'Permission denied' });
    }
    const type = url.searchParams.get('type');
    const params = [ctx.householdId];
    let sql = 'SELECT * FROM categories WHERE household_id = $1';

    if (type) {
      params.push(type);
      sql += ' AND type = $2';
    }

    const rows = await query(`${sql} ORDER BY name ASC`, params);
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'DELETE') {
    if (!requirePermission(ctx, 'categories:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/categories');
    if (!id) return sendJson(res, 400, { success: false, error: 'Category ID required' });
    const rows = await query('DELETE FROM categories WHERE id = $1 AND household_id = $2 RETURNING id', [id, ctx.householdId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Category deleted successfully' : 'Category not found',
    });
  }

  if (req.method === 'PATCH') {
    if (!requirePermission(ctx, 'categories:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/categories');
    if (!id) return sendJson(res, 400, { success: false, error: 'Category ID required' });
    const { name, icon, color, type } = await readJson(req);
    const rows = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color),
           type = COALESCE($4, type)
       WHERE id = $5 AND household_id = $6
       RETURNING *`,
      [name, icon, color, type, id, ctx.householdId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0],
      message: rows.length ? 'Category updated successfully' : 'Category not found',
    });
  }

  if (!requirePermission(ctx, 'categories:manage')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const { name, icon, color, type } = await readJson(req);
  if (!name || !type) return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  if (!['expense', 'income'].includes(type)) return sendJson(res, 400, { success: false, error: 'Invalid category type' });

  const rows = await query(
    `INSERT INTO categories (household_id, user_id, name, icon, color, type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [ctx.householdId, ctx.userId, name, icon || 'tag', color || '#10b981', type]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Category created successfully' });
}

async function handleTransactions(req, res, url, table) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  const permView = table === 'expenses' ? 'expenses:view' : 'income:view';
  const permCreate = table === 'expenses' ? 'expenses:create' : 'income:create';
  const permEdit = table === 'expenses' ? 'expenses:edit' : 'income:edit';
  const permDelete = table === 'expenses' ? 'expenses:delete' : 'income:delete';

  if (req.method === 'GET') {
    if (!requirePermission(ctx, permView)) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    const categoryId = url.searchParams.get('categoryId');
    const params = [ctx.householdId];
    let sql = `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon FROM ${table} t JOIN categories c ON c.id = t.category_id WHERE t.household_id = $1`;

    if (month && year) {
      params.push(`${year}-${String(month).padStart(2, '0')}-01`);
      sql += ` AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $${params.length}::date)`;
    }

    if (categoryId) {
      params.push(categoryId);
      sql += ` AND t.category_id = $${params.length}`;
    }

    const rows = await query(`${sql} ORDER BY t.date DESC`, params);
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'DELETE') {
    if (!requirePermission(ctx, permDelete)) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, `/api/${table}`);
    if (!id) return sendJson(res, 400, { success: false, error: 'Transaction ID required' });
    const rows = await query(`DELETE FROM ${table} WHERE id = $1 AND household_id = $2 RETURNING id`, [id, ctx.householdId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Transaction deleted successfully' : 'Transaction not found',
    });
  }

  if (req.method === 'PATCH') {
    if (!requirePermission(ctx, permEdit)) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, `/api/${table}`);
    if (!id) return sendJson(res, 400, { success: false, error: 'Transaction ID required' });

    const body = await readJson(req);
    const allowedFields = table === 'expenses'
      ? ['category_id', 'amount', 'description', 'date', 'payment_method', 'notes']
      : ['category_id', 'amount', 'description', 'date', 'source', 'notes'];

    if (table === 'expenses' && body.amount !== undefined) {
      const existing = await query('SELECT category_id, amount FROM expenses WHERE id = $1 AND household_id = $2', [id, ctx.householdId]);
      if (existing.length > 0) {
        const catId = body.category_id !== undefined ? body.category_id : existing[0].category_id;
        const oldAmount = Number(existing[0].amount);
        const newAmount = Number(body.amount);
        const diff = newAmount - oldAmount;
        if (diff > 0) {
          const budgetCheck = await query(
            `SELECT b.limit_amount,
              COALESCE((
                SELECT SUM(e.amount)
                FROM expenses e
                WHERE e.household_id = b.household_id
                  AND e.category_id = b.category_id
                  AND e.date >= b.period_start_date
                  AND (
                    (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
                    (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
                    (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
                  )
              ), 0) AS spent_amount
             FROM budgets b
             WHERE b.household_id = $1 AND b.category_id = $2 AND b.is_active = true`,
            [ctx.householdId, catId]
          );
          if (budgetCheck.length > 0) {
            const { limit_amount, spent_amount } = budgetCheck[0];
            if (Number(spent_amount) + diff > Number(limit_amount)) {
              return sendJson(res, 400, {
                success: false,
                error: 'Budget limit exceeded — this update would put the category over its limit',
              });
            }
          }
        }
      }
    }

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        params.push(body[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length === 0) return sendJson(res, 400, { success: false, error: 'No changes supplied' });

    params.push(id, ctx.householdId);
    const rows = await query(
      `UPDATE ${table}
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${params.length - 1} AND household_id = $${params.length}
       RETURNING *`,
      params
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0],
      message: rows.length ? 'Transaction updated successfully' : 'Transaction not found',
    });
  }

  if (!requirePermission(ctx, permCreate)) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const body = await readJson(req);
  const { category_id, amount, description, date, notes } = body;
  if (!category_id || !amount || !date) return sendJson(res, 400, { success: false, error: 'Missing required fields' });

  if (table === 'expenses') {
    const budgetCheck = await query(
      `SELECT b.id, b.limit_amount,
        COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.household_id = b.household_id
            AND e.category_id = b.category_id
            AND e.date >= b.period_start_date
            AND (
              (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
              (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
              (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
            )
        ), 0) AS spent_amount
       FROM budgets b
       WHERE b.household_id = $1 AND b.category_id = $2 AND b.is_active = true`,
      [ctx.householdId, category_id]
    );
    if (budgetCheck.length > 0) {
      const { limit_amount, spent_amount } = budgetCheck[0];
      if (Number(spent_amount) + Number(amount) > Number(limit_amount)) {
        return sendJson(res, 400, {
          success: false,
          error: 'Budget limit exceeded — this expense would put the category over its limit',
        });
      }
    }
    const rows = await query(
      `INSERT INTO expenses (household_id, user_id, category_id, amount, description, date, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ctx.householdId, ctx.userId, category_id, amount, description, date, body.payment_method, notes]
    );
    return sendJson(res, 201, { success: true, data: rows[0], message: 'Expense created successfully' });
  }

  const rows = await query(
    `INSERT INTO income (household_id, user_id, category_id, amount, description, date, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [ctx.householdId, ctx.userId, category_id, amount, description, date, body.source, notes]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Income recorded successfully' });
}

async function handleBudgets(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    if (!requirePermission(ctx, 'budgets:view')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const rows = await query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color,
        COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.household_id = b.household_id
            AND e.category_id = b.category_id
            AND e.date >= b.period_start_date
            AND (
              (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
              (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
              (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
            )
        ), 0) AS spent_amount
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.household_id = $1 AND b.is_active = true
       ORDER BY b.created_at DESC`,
      [ctx.householdId]
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'PATCH') {
    if (!requirePermission(ctx, 'budgets:edit')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/budgets');
    if (!id) return sendJson(res, 400, { success: false, error: 'Budget ID required' });
    const { limit_amount, period, alert_threshold, period_start_date } = await readJson(req);
    const rows = await query(
      `UPDATE budgets
       SET limit_amount = COALESCE($1, limit_amount),
           period = COALESCE($2, period),
           alert_threshold = COALESCE($3, alert_threshold),
           period_start_date = COALESCE($4, period_start_date),
           updated_at = NOW()
       WHERE id = $5 AND household_id = $6
       RETURNING *`,
      [limit_amount, period, alert_threshold, period_start_date, id, ctx.householdId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0],
      message: rows.length ? 'Budget updated successfully' : 'Budget not found',
    });
  }

  if (req.method === 'DELETE') {
    if (!requirePermission(ctx, 'budgets:delete')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/budgets');
    if (!id) return sendJson(res, 400, { success: false, error: 'Budget ID required' });
    const rows = await query(
      'UPDATE budgets SET is_active = false, updated_at = NOW() WHERE id = $1 AND household_id = $2 RETURNING id',
      [id, ctx.householdId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Budget deleted successfully' : 'Budget not found',
    });
  }

  if (!requirePermission(ctx, 'budgets:create')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const { category_id, limit_amount, period, alert_threshold, period_start_date } = await readJson(req);
  if (!category_id || !limit_amount || !period) return sendJson(res, 400, { success: false, error: 'Missing required fields' });
  if (!['monthly', 'yearly', 'weekly'].includes(period)) return sendJson(res, 400, { success: false, error: 'Invalid period' });

  const rows = await query(
    `INSERT INTO budgets (household_id, user_id, category_id, limit_amount, period, alert_threshold, period_start_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [ctx.householdId, ctx.userId, category_id, limit_amount, period, alert_threshold || 80, period_start_date || new Date().toISOString().split('T')[0]]
  );
  return sendJson(res, 201, { success: true, data: rows[0], message: 'Budget created successfully' });
}

async function handleGoals(req, res, url) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });

  if (req.method === 'GET') {
    if (!requirePermission(ctx, 'goals:view')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const rows = await query(
      'SELECT * FROM financial_goals WHERE household_id = $1 ORDER BY deadline ASC',
      [ctx.householdId]
    );
    return sendJson(res, 200, { success: true, data: rows.map(serializeGoal) });
  }

  if (req.method === 'PATCH') {
    if (!requirePermission(ctx, 'goals:edit')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/goals');
    if (!id) return sendJson(res, 400, { success: false, error: 'Goal ID required' });
    const body = await readJson(req);
    const rows = await query(
      `UPDATE financial_goals
       SET name = COALESCE($1, name),
           target_amount = COALESCE($2, target_amount),
           deadline = COALESCE($3, deadline),
           category = COALESCE($4, category),
           priority = COALESCE($5, priority),
           current_amount = COALESCE($6, current_amount),
           is_completed = COALESCE($7, is_completed),
           updated_at = NOW()
       WHERE id = $8 AND household_id = $9
       RETURNING *`,
      [body.name, body.target_amount, body.deadline, body.category, body.priority, body.current_amount, body.is_completed, id, ctx.householdId]
    );
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      data: rows[0] && serializeGoal(rows[0]),
      message: rows.length ? 'Goal updated successfully' : 'Goal not found',
    });
  }

  if (req.method === 'DELETE') {
    if (!requirePermission(ctx, 'goals:delete')) return sendJson(res, 403, { success: false, error: 'Permission denied' });
    const id = idFromPath(url.pathname, '/api/goals');
    if (!id) return sendJson(res, 400, { success: false, error: 'Goal ID required' });
    const rows = await query('DELETE FROM financial_goals WHERE id = $1 AND household_id = $2 RETURNING id', [id, ctx.householdId]);
    return sendJson(res, rows.length ? 200 : 404, {
      success: rows.length > 0,
      message: rows.length ? 'Goal deleted successfully' : 'Goal not found',
    });
  }

  if (!requirePermission(ctx, 'goals:create')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const { name, target_amount, deadline, category, priority, current_amount } = await readJson(req);
  if (!name || !target_amount) return sendJson(res, 400, { success: false, error: 'Missing required fields' });

  const rows = await query(
    `INSERT INTO financial_goals (household_id, user_id, name, target_amount, current_amount, deadline, category, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [ctx.householdId, ctx.userId, name, target_amount, current_amount || 0, deadline || null, category, priority || 'medium']
  );
  return sendJson(res, 201, { success: true, data: serializeGoal(rows[0]), message: 'Goal created successfully' });
}

async function handleReports(req, res) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });
  if (!requirePermission(ctx, 'reports:view')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const rows = await query(
    `SELECT
      COALESCE((SELECT SUM(amount) FROM income WHERE household_id = $1), 0) AS total_income,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE household_id = $1), 0) AS total_expenses,
      COALESCE((SELECT SUM(target_amount - current_amount) FROM financial_goals WHERE household_id = $1 AND is_completed = false), 0) AS remaining_goals,
      (
        SELECT COALESCE(json_agg(row_to_json(category_totals)), '[]'::json)
        FROM (
          SELECT c.name, c.color, COALESCE(SUM(e.amount), 0) AS amount
          FROM categories c
          LEFT JOIN expenses e ON e.category_id = c.id AND e.household_id = c.household_id
          WHERE c.household_id = $1 AND c.type = 'expense'
          GROUP BY c.name, c.color
          ORDER BY amount DESC
        ) category_totals
      ) AS category_totals`,
    [ctx.householdId]
  );

  return sendJson(res, 200, { success: true, data: rows[0] });
}

async function handleAlerts(req, res) {
  const ctx = await getHouseholdContext(req);
  if (!ctx) return sendJson(res, 401, { success: false, error: 'Unauthorized' });
  if (!requirePermission(ctx, 'budgets:view')) return sendJson(res, 403, { success: false, error: 'Permission denied' });

  const rows = await query(
    `SELECT b.id, c.name AS category_name, b.limit_amount, b.alert_threshold,
      COALESCE(SUM(e.amount), 0) AS spent_amount
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN expenses e ON e.household_id = b.household_id
       AND e.category_id = b.category_id
       AND e.date >= b.period_start_date
       AND (
         (b.period = 'weekly' AND e.date < b.period_start_date + INTERVAL '7 days') OR
         (b.period = 'monthly' AND e.date < b.period_start_date + INTERVAL '1 month') OR
         (b.period = 'yearly' AND e.date < b.period_start_date + INTERVAL '1 year')
       )
     WHERE b.household_id = $1 AND b.is_active = true
     GROUP BY b.id, c.name
     HAVING CASE WHEN b.limit_amount > 0 THEN (COALESCE(SUM(e.amount), 0) / b.limit_amount) * 100 ELSE 0 END >= b.alert_threshold
     ORDER BY spent_amount DESC`,
    [ctx.householdId]
  );

  return sendJson(res, 200, { success: true, data: rows });
}

// ─── Super-admin helpers ────────────────────────────────────────────

async function isSuperAdmin(userId) {
  const rows = await query('SELECT is_super_admin FROM users WHERE id = $1', [userId]);
  return rows.length > 0 && rows[0].is_super_admin === true;
}

async function handleAdminHouseholds(req, res, url) {
  const userId = getUserId(req);
  if (!userId || !(await isSuperAdmin(userId))) {
    return sendJson(res, 403, { success: false, error: 'Super-admin access required' });
  }

  if (req.method === 'GET') {
    const rows = await query(
      `SELECT h.*, u.email AS owner_email, u.full_name AS owner_name,
        (SELECT COUNT(*) FROM household_members hm
         JOIN users mu ON mu.id = hm.user_id
         WHERE hm.household_id = h.id AND mu.is_super_admin = false) AS member_count
       FROM households h
       JOIN users u ON u.id = h.owner_id
       ORDER BY h.created_at DESC`
    );
    return sendJson(res, 200, { success: true, data: rows });
  }

  if (req.method === 'POST') {
    const { name, admin_email, admin_name, admin_password } = await readJson(req);
    if (!name || !admin_email) {
      return sendJson(res, 400, { success: false, error: 'Household name and admin email required' });
    }

    // Create or find admin user
    let adminUser = await query('SELECT id FROM users WHERE email = $1', [admin_email]);
    let adminUserId;
    if (adminUser.length > 0) {
      adminUserId = adminUser[0].id;
    } else {
      if (!admin_password) return sendJson(res, 400, { success: false, error: 'Password required for new admin user' });
      if (admin_password.length < 6) return sendJson(res, 400, { success: false, error: 'Password must be at least 6 characters' });
      const newUser = await query(
        `INSERT INTO users (email, full_name, password_hash, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [admin_email, admin_name || 'Household Admin', hashPassword(admin_password)]
      );
      adminUserId = newUser[0].id;
    }

    // Create household
    const hh = await query(
      `INSERT INTO households (name, owner_id) VALUES ($1, $2) RETURNING *`,
      [name, adminUserId]
    );
    const householdId = hh[0].id;

    const roles = await ensureDefaultRoles(householdId);
    await query(
      `INSERT INTO household_members (household_id, user_id, role_id) VALUES ($1, $2, $3)
       ON CONFLICT (household_id, user_id) DO NOTHING`,
      [householdId, adminUserId, roles.adminRoleId]
    );

    // Seed default categories for the admin
    try {
      await seedDefaultCategories(adminUserId);
    } catch (_) {}

    return sendJson(res, 201, {
      success: true,
      data: { ...hh[0], admin_user_id: adminUserId },
      message: 'Household created with admin',
    });
  }

  return sendJson(res, 404, { message: 'Not found' });
}

async function handleAdminHouseholdMembers(req, res, url) {
  const userId = getUserId(req);
  if (!userId || !(await isSuperAdmin(userId))) {
    return sendJson(res, 403, { success: false, error: 'Super-admin access required' });
  }

  const match = url.pathname.match(/^\/api\/admin\/households\/(\d+)\/members$/);
  const householdId = match ? Number(match[1]) : null;
  if (!householdId) return sendJson(res, 400, { success: false, error: 'Household ID required' });

  const rows = await query(
    `SELECT hm.id, hm.user_id, hm.role_id, hm.created_at AS joined_at,
            u.email, u.full_name,
            hr.name AS role_name
     FROM household_members hm
     JOIN users u ON u.id = hm.user_id
     LEFT JOIN household_roles hr ON hr.id = hm.role_id
     WHERE hm.household_id = $1 AND u.is_super_admin = false
     ORDER BY hm.created_at ASC`,
    [householdId]
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
    if ((url.pathname === '/api/categories' || url.pathname.startsWith('/api/categories/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleCategories(req, res, url);
    }
    if ((url.pathname === '/api/expenses' || url.pathname.startsWith('/api/expenses/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleTransactions(req, res, url, 'expenses');
    }
    if ((url.pathname === '/api/income' || url.pathname.startsWith('/api/income/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      return await handleTransactions(req, res, url, 'income');
    }
    if ((url.pathname === '/api/budgets' || url.pathname.startsWith('/api/budgets/')) && ['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
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
    // ─── Multi-tenant routes ─────────────────────────────────────
    if ((url.pathname === '/api/households/members' || url.pathname.startsWith('/api/households/members/')) && ['GET', 'POST', 'DELETE', 'PATCH'].includes(req.method)) {
      return await handleMembers(req, res, url);
    }
    if (url.pathname === '/api/households/roles' && ['GET', 'POST'].includes(req.method)) {
      return await handleRoles(req, res, url);
    }
    if (url.pathname.startsWith('/api/households/roles/') && ['DELETE', 'PATCH'].includes(req.method)) {
      return await handleRoleById(req, res, url);
    }
    if (url.pathname === '/api/households/permissions' && req.method === 'GET') {
      return await handlePermissionsList(req, res);
    }
    if (url.pathname === '/api/households/my-permissions' && req.method === 'GET') {
      return await handleMyPermissions(req, res);
    }
    if ((url.pathname === '/api/households' || url.pathname.startsWith('/api/households/')) && req.method === 'PATCH') {
      return await handleHouseholdPatch(req, res, url);
    }
    if (url.pathname === '/api/households' && req.method === 'GET') {
      return await handleHouseholds(req, res);
    }
    if (url.pathname === '/api/households' && req.method === 'POST') {
      const uid = getUserId(req);
      if (!uid || !(await isSuperAdmin(uid))) {
        return sendJson(res, 403, { success: false, error: 'Only super-admin can create households' });
      }
      return await handleHouseholds(req, res);
    }
    // ─── Super-admin routes ───────────────────────────────────────
    if (url.pathname === '/api/admin/households' && ['GET', 'POST'].includes(req.method)) {
      return await handleAdminHouseholds(req, res, url);
    }
    if (url.pathname.match(/^\/api\/admin\/households\/\d+\/members$/) && req.method === 'GET') {
      return await handleAdminHouseholdMembers(req, res, url);
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

ensureSuperAdmin().then(() => {
  server.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Super-admin seed failed:', err.message);
  server.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
  });
});
