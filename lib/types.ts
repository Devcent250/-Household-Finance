export interface User {
  id: number;
  email: string;
  full_name: string;
  currency: string;
  theme: 'light' | 'dark';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  created_at: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  payment_method: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  source: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  limit_amount: number;
  period: 'monthly' | 'yearly' | 'weekly';
  alert_threshold: number;
  period_start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistory {
  id: number;
  user_id: number;
  transaction_type: string;
  transaction_id: number;
  amount: number;
  description: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
