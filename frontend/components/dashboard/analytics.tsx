'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Legend } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Category, Expense, Income } from '@/lib/types';
import { useCurrency } from '@/components/currency-provider';
import { EmptyState, WorkspaceCard } from './dashboard-ui';
import type { DateRange } from 'react-day-picker';

interface AnalyticsProps {
  userId: string;
}

interface ChartData {
  name: string;
  value: number;
  amount?: number;
  income?: number;
  expense?: number;
}

const COLORS = ['#059669', '#38bdf8', '#f59e0b', '#a78bfa', '#fb7185', '#14b8a6', '#f97316', '#8b5cf6'];

export default function Analytics({ userId }: AnalyticsProps) {
  const { formatCurrency } = useCurrency();
  const now = new Date();
  const [preset, setPreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(now),
    to: now,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const n = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: n, to: n });
        break;
      case 'yesterday': {
        const day = subDays(n, 1);
        setDateRange({ from: day, to: day });
        break;
      }
      case 'last7':
        setDateRange({ from: subDays(n, 6), to: n });
        break;
      case 'last30':
        setDateRange({ from: subDays(n, 29), to: n });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(n), to: n });
        break;
      case 'lastMonth': {
        const lastMonthDate = subDays(startOfMonth(n), 1);
        setDateRange({
          from: startOfMonth(lastMonthDate),
          to: endOfMonth(lastMonthDate),
        });
        break;
      }
      default:
        break;
    }
  }, [preset]);

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [expensesRes, incomeRes, categoriesRes] = await Promise.all([
        apiFetch('/api/expenses', userId),
        apiFetch('/api/income', userId),
        apiFetch('/api/categories', userId),
      ]);
      const expensesData = await expensesRes.json();
      const incomeData = await incomeRes.json();
      const categoriesData = await categoriesRes.json();
      setExpenses(expensesData.data || []);
      setIncomes(incomeData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(
    () => {
      if (!dateRange?.from) return expenses;
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      return expenses.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
    },
    [expenses, dateRange]
  );

  const filteredIncome = useMemo(
    () => {
      if (!dateRange?.from) return incomes;
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      return incomes.filter((inc) => {
        const d = new Date(inc.date);
        return d >= start && d <= end;
      });
    },
    [incomes, dateRange]
  );

  const expensesByCategory = useMemo(
    () => {
      const map = new Map<string, number>();
      filteredExpenses.forEach((e) => {
        const cat = categories.find((c) => c.id === e.category_id)?.name || `Cat ${e.category_id}`;
        map.set(cat, (map.get(cat) || 0) + Number(e.amount));
      });
      return Array.from(map, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);
    },
    [filteredExpenses, categories]
  );

  const incomeByCategory = useMemo(
    () => {
      const map = new Map<string, number>();
      filteredIncome.forEach((inc) => {
        const cat = categories.find((c) => c.id === inc.category_id)?.name || `Cat ${inc.category_id}`;
        map.set(cat, (map.get(cat) || 0) + Number(inc.amount));
      });
      return Array.from(map, ([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);
    },
    [filteredIncome, categories]
  );

  const monthlyTrend = useMemo(
    () => {
      const monthlyData: ChartData[] = [];
      if (!dateRange?.from) return monthlyData;
      const start = dateRange.from;
      const end = dateRange.to || dateRange.from;
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        const month = cursor.getMonth();
        const year = cursor.getFullYear();
        const expVal = filteredExpenses
          .filter((e) => { const d = new Date(e.date); return d.getMonth() === month && d.getFullYear() === year; })
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const incVal = filteredIncome
          .filter((inc) => { const d = new Date(inc.date); return d.getMonth() === month && d.getFullYear() === year; })
          .reduce((sum, inc) => sum + Number(inc.amount), 0);
        monthlyData.push({
          name: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          value: Math.round(expVal * 100) / 100,
          amount: Math.round(expVal * 100) / 100,
          expense: Math.round(expVal * 100) / 100,
          income: Math.round(incVal * 100) / 100,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return monthlyData;
    },
    [filteredExpenses, filteredIncome, dateRange]
  );

  const totalExpenses = expensesByCategory.reduce((s, c) => s + c.value, 0);
  const totalIncome = incomeByCategory.reduce((s, c) => s + c.value, 0);
  const avgExpense = monthlyTrend.length > 0 ? monthlyTrend.reduce((s, m) => s + Number(m.expense || 0), 0) / monthlyTrend.length : 0;
  const avgIncome = monthlyTrend.length > 0 ? monthlyTrend.reduce((s, m) => s + Number(m.income || 0), 0) / monthlyTrend.length : 0;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const topExpense = expensesByCategory[0];
  const peakMonth = useMemo(
    () => monthlyTrend.reduce<ChartData | null>((p, m) => (!p || Number(m.expense || 0) > Number(p.expense || 0) ? m : p), null),
    [monthlyTrend]
  );

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))', fontSize: '12px' };

  if (loading) return <div className="text-center py-8 text-sm">Loading analytics...</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="last7">Last 7 days</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="thisMonth">This month</SelectItem>
            <SelectItem value="lastMonth">Last month</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-8 justify-between border-border bg-background px-3 text-xs shadow-sm">
              <span className="flex min-w-0 items-center gap-2 truncate">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy')
                    )
                  ) : (
                    'Select date range'
                  )}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-border bg-card p-0 shadow-xl" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                setPreset('custom');
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total Income" value={formatCurrency(totalIncome)} helper={`${filteredIncome.length} income entr${filteredIncome.length === 1 ? 'y' : 'ies'}`} />
        <MetricCard label="Total Expenses" value={formatCurrency(totalExpenses)} helper={`${filteredExpenses.length} expense entr${filteredExpenses.length === 1 ? 'y' : 'ies'}`} />
        <MetricCard label="Net Savings" value={formatCurrency(totalIncome - totalExpenses)} helper={totalIncome > 0 ? `${savingsRate.toFixed(1)}% savings rate` : 'No income data'} />
        <MetricCard label="Monthly Avg" value={formatCurrency(avgExpense)} helper={`vs ${formatCurrency(avgIncome)} income`} />
        <MetricCard label="Top Category" value={topExpense ? topExpense.name : 'None'} helper={topExpense ? formatCurrency(topExpense.value) : ''} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <WorkspaceCard title="Expense Distribution" description="Category breakdown for the selected period.">
          {expensesByCategory.length === 0 ? (
            <EmptyState title="No expense data" />
          ) : (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative h-[220px] w-full shrink-0 xl:w-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={84} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} dataKey="value">
                      {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <div className="text-[10px] text-muted-foreground">Total</div>
                    <div className="text-sm font-semibold">{formatCurrency(totalExpenses)}</div>
                  </div>
                </div>
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5">
                {expensesByCategory.slice(0, 6).map((cat, i) => {
                  const pct = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{cat.name}</span>
                      <span className="text-xs font-semibold text-foreground">{pct.toFixed(1)}%</span>
                      <span className="text-[11px] text-muted-foreground">{formatCurrency(cat.value)}</span>
                    </div>
                  );
                })}
                {expensesByCategory.length > 6 && (
                  <div className="text-[11px] text-muted-foreground text-center py-1">+{expensesByCategory.length - 6} more categories</div>
                )}
              </div>
            </div>
          )}
        </WorkspaceCard>

        <WorkspaceCard title="Income vs Expenses" description="Monthly comparison over the selected period.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyTrend} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#ef4444" radius={[3, 3, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </WorkspaceCard>

        <WorkspaceCard title="Monthly Trend" description="Expense and income pattern over the selected period.">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3, strokeWidth: 1.5, stroke: 'hsl(var(--card))' }} activeDot={{ r: 5 }} name="Expenses" />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3, strokeWidth: 1.5, stroke: 'hsl(var(--card))' }} activeDot={{ r: 5 }} name="Income" />
            </LineChart>
          </ResponsiveContainer>
        </WorkspaceCard>

        <WorkspaceCard title="Income Distribution" description="Category breakdown for the selected period.">
          {incomeByCategory.length === 0 ? (
            <EmptyState title="No income data" />
          ) : (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="relative h-[200px] w-full shrink-0 xl:w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={44} outerRadius={74} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2} dataKey="value">
                      {incomeByCategory.map((_, i) => <Cell key={i} fill={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669', '#047857'][i % 6]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center leading-tight">
                    <div className="text-[10px] text-muted-foreground">Total</div>
                    <div className="text-sm font-semibold">{formatCurrency(totalIncome)}</div>
                  </div>
                </div>
              </div>
              <div className="grid min-w-0 flex-1 gap-1.5">
                {incomeByCategory.slice(0, 5).map((cat, i) => {
                  const pct = totalIncome > 0 ? (cat.value / totalIncome) * 100 : 0;
                  return (
                    <div key={cat.name} className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2.5 py-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'][i % 5] }} />
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{cat.name}</span>
                      <span className="text-xs font-semibold text-foreground">{pct.toFixed(1)}%</span>
                      <span className="text-[11px] text-muted-foreground">{formatCurrency(cat.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </WorkspaceCard>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-base font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{helper}</div>
    </div>
  );
}
