'use client';

import { useEffect, useMemo, useState } from 'react';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, CalendarRange, Tags, TrendingDown, WalletCards } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import type { Category, Expense } from '@/lib/types';
import { useCurrency } from '@/components/currency-provider';
import { EmptyState, FeatureShell, WorkspaceCard } from './dashboard-ui';

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

  const COLORS = ['#059669', '#38bdf8', '#f59e0b', '#a78bfa', '#fb7185', '#14b8a6'];

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
        name,
        value: Math.round(value * 100) / 100,
      })).sort((a, b) => b.value - a.value);

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

  const totalTrackedSpend = expensesByCategory.reduce((sum, category) => sum + category.value, 0);
  const averageMonthlySpend = monthlyTrend.length > 0
    ? monthlyTrend.reduce((sum, item) => sum + Number(item.amount || 0), 0) / monthlyTrend.length
    : 0;
  const topCategory = expensesByCategory[0];
  const peakMonth = useMemo(
    () => monthlyTrend.reduce<ChartData | null>((peak, item) => (!peak || Number(item.amount || 0) > Number(peak.amount || 0) ? item : peak), null),
    [monthlyTrend]
  );
  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    color: 'hsl(var(--foreground))',
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric
          icon={WalletCards}
          label="Tracked Spend"
          value={formatCurrency(totalTrackedSpend)}
          helper="All expenses included in analytics"
        />
        <AnalyticsMetric
          icon={CalendarRange}
          label="Monthly Average"
          value={formatCurrency(averageMonthlySpend)}
          helper="Average over the last 6 months"
        />
        <AnalyticsMetric
          icon={Tags}
          label="Top Category"
          value={topCategory ? topCategory.name : 'None'}
          helper={topCategory ? formatCurrency(topCategory.value) : 'No category data yet'}
        />
        <AnalyticsMetric
          icon={TrendingDown}
          label="Peak Month"
          value={peakMonth ? peakMonth.name : 'None'}
          helper={peakMonth ? formatCurrency(Number(peakMonth.amount || 0)) : 'No spending trend yet'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceCard title="Expenses by Category" description="Category share based on recorded expense transactions.">
            {expensesByCategory.length === 0 ? (
              <EmptyState title="No expense data available" description="Record expenses to populate category analytics." />
            ) : (
              <div className="grid gap-5 xl:grid-cols-[minmax(260px,1fr)_260px] xl:items-center">
                <div className="relative h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={118}
                        paddingAngle={2}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        dataKey="value"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground">Total</div>
                      <div className="text-xl font-semibold text-foreground">{formatCurrency(totalTrackedSpend)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {expensesByCategory.map((category, index) => {
                    const share = totalTrackedSpend > 0 ? (category.value / totalTrackedSpend) * 100 : 0;

                    return (
                      <div key={category.name} className="rounded-lg border border-border bg-background/70 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="truncate text-sm font-medium text-foreground">{category.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{share.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{formatCurrency(category.value)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </WorkspaceCard>

        <WorkspaceCard title="Monthly Spending Trend" description="Six-month expense pattern for recurring review.">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={monthlyTrend} margin={{ top: 20, right: 24, left: 8, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => String(value)} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 7, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
                  name="Monthly Spending"
                />
              </LineChart>
            </ResponsiveContainer>
        </WorkspaceCard>
      </div>
    </FeatureShell>
  );
}

function AnalyticsMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{helper}</div>
    </div>
  );
}
