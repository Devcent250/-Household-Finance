-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'USD',
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Households table (multi-tenant)
CREATE TABLE IF NOT EXISTS households (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Household roles (custom roles created by admin)
CREATE TABLE IF NOT EXISTS household_roles (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions
CREATE TABLE IF NOT EXISTS household_role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES household_roles(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  UNIQUE(role_id, permission_key)
);

-- Household members
CREATE TABLE IF NOT EXISTS household_members (
  id SERIAL PRIMARY KEY,
  household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES household_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, user_id)
);

-- Categories table (now household-scoped)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(household_id, name, type)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(500),
  date DATE NOT NULL,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Income table
CREATE TABLE IF NOT EXISTS income (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(500),
  date DATE NOT NULL,
  source VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount DECIMAL(12, 2) NOT NULL,
  period VARCHAR(20) NOT NULL,
  alert_threshold DECIMAL(5, 2) DEFAULT 80,
  period_start_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Financial Goals table
CREATE TABLE IF NOT EXISTS financial_goals (
  id SERIAL PRIMARY KEY,
  household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  deadline DATE,
  category VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'medium',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions History for audit trail
CREATE TABLE IF NOT EXISTS transactions_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_id INTEGER,
  amount DECIMAL(12, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_households_owner ON households(owner_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_roles_household ON household_roles(household_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON household_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household ON expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_income_household ON income(household_id);
CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_household ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_household ON financial_goals(household_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON financial_goals(user_id);
