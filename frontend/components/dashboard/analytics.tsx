'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import type { Category, Expense } from '@/lib/types';
import { useCurrency } from '@/components/currency-provider';
import { EmptyState, FeatureShell, MetricStrip, WorkspaceCard } from './dashboard-ui';

interface AnalyticsProps {
  userId: string;
}

interface ChartData {
  name: string;
  value: number;
  amount?: number;
}

export default function Analytics({ userId }: AnalyticsProps) {
  const { formatCurrency } = useCurrency();
  const [expensesByCategory, setExpensesByCategory] = useState<ChartData[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#235347', '#8eb69b', '#51a883', '#3a8373', '#1f6b5e'];

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      const currentDate = new Date();
      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(apiUrl('/api/expenses'), {
          headers: { 'x-user-id': userId },
        }),
        fetch(apiUrl('/api/categories?type=expense'), {
          headers: { 'x-user-id': userId },
        }),
      ]);
      const expensesData = await expensesRes.json();
      const categoriesData = await categoriesRes.json();
      const expenses = (expensesData.data || []) as Expense[];
      const categories = (categoriesData.data || []) as Category[];

      const categoryMap = new Map<string, number>();
      expenses.forEach((expense) => {
        const category = categories.find((item) => item.id === expense.category_id)?.name || `Category ${expense.category_id}`;
        categoryMap.set(category, (categoryMap.get(category) || 0) + Number(expense.amount));
      });

      const categoryChartData = Array.from(categoryMap, ([name, value]) => ({
        name: `Category ${name}`,
        value: Math.round(value * 100) / 100,
      }));

      setExpensesByCategory(categoryChartData);

      const monthlyData: ChartData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const value = expenses
          .filter((expense) => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
          })
          .reduce((sum, expense) => sum + Number(expense.amount), 0);

        monthlyData.push({
          name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: Math.round(value * 100) / 100,
          amount: Math.round(value * 100) / 100,
        });
      }
      setMonthlyTrend(monthlyData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <FeatureShell
      title="Analytics"
      description="Visualize spending distribution, month-to-month trends, and summary signals for household expenses."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><BarChart3 className="h-4 w-4" /> Analytics workspace</span>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceCard title="Expenses by Category" description="Category share based on recorded expense transactions.">
            {expensesByCategory.length === 0 ? (
              <EmptyState title="No expense data available" description="Record expenses to populate category analytics." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(Number(value))}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </WorkspaceCard>

        <WorkspaceCard title="Monthly Spending Trend" description="Six-month expense pattern for recurring review.">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(163, 25%, 85%)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#235347"
                  strokeWidth={2}
                  dot={{ fill: '#235347', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Monthly Spending"
                />
              </LineChart>
            </ResponsiveContainer>
        </WorkspaceCard>
      </div>

      <WorkspaceCard title="Spending Summary" description="Quick totals derived from the current analytics data.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricStrip label="Total This Month" value={formatCurrency(expensesByCategory.reduce((sum, cat) => sum + cat.value, 0))} />
            <MetricStrip label="Average Daily" value={formatCurrency(expensesByCategory.reduce((sum, cat) => sum + cat.value, 0) / 30)} />
            <MetricStrip label="Categories Tracked" value={expensesByCategory.length} tone="text-foreground" />
          </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
