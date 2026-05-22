'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfMonth, format, isWithinInterval, startOfMonth, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Budget, Category, Expense, FinancialGoal, Income } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import {
  Target,
  ArrowRight,
  Calendar as CalendarIcon,
  ReceiptText,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface OverviewProps {
  userId: string;
}

type TransactionItem = {
  id: string;
  type: 'Income' | 'Expense';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
};

export default function DashboardOverview({ userId }: OverviewProps) {
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [preset, setPreset] = useState('today');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentDate = new Date();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const [expensesRes, incomeRes, budgetsRes, goalsRes, categoriesRes] = await Promise.all([
          fetch(apiUrl(`/api/expenses?month=${month}&year=${year}`), {
            headers: { 'x-user-id': userId },
          }),
          fetch(apiUrl(`/api/income?month=${month}&year=${year}`), {
            headers: { 'x-user-id': userId },
          }),
          fetch(apiUrl('/api/budgets'), {
            headers: { 'x-user-id': userId },
          }),
          fetch(apiUrl('/api/goals'), {
            headers: { 'x-user-id': userId },
          }),
          fetch(apiUrl('/api/categories'), {
            headers: { 'x-user-id': userId },
          }),
        ]);

        const [expensesData, incomeData, budgetsData, goalsData, categoriesData] = await Promise.all([
          expensesRes.json(),
          incomeRes.json(),
          budgetsRes.json(),
          goalsRes.json(),
          categoriesRes.json(),
        ]);

        setExpenses(expensesData.data || []);
        setIncome(incomeData.data || []);
        setBudgets(budgetsData.data || []);
        setGoals(goalsData.data || []);
        setCategories(categoriesData.data || []);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      }
    };

    fetchData();
  }, [userId]);

  useEffect(() => {
    const now = new Date();

    switch (preset) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'yesterday': {
        const day = subDays(now, 1);
        setDateRange({ from: day, to: day });
        break;
      }
      case 'last7':
        setDateRange({ from: subDays(now, 6), to: now });
        break;
      case 'last30':
        setDateRange({ from: subDays(now, 29), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: now });
        break;
      case 'lastMonth': {
        const lastMonthDate = subDays(startOfMonth(now), 1);
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

  const matchesRange = (value: string) => {
    if (!dateRange?.from) {
      return true;
    }

    const date = new Date(value);
    const start = dateRange.from;
    const end = dateRange.to || dateRange.from;

    return isWithinInterval(date, { start, end });
  };

  const filteredExpenses = useMemo(
    () => expenses.filter((item) => matchesRange(item.date)),
    [expenses, dateRange]
  );

  const filteredIncome = useMemo(
    () => income.filter((item) => matchesRange(item.date)),
    [income, dateRange]
  );

  const totalIncome = useMemo(
    () => filteredIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [filteredIncome]
  );

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [filteredExpenses]
  );

  const budgetSpending = useMemo(
    () => budgets.reduce((sum, budget) => sum + Number(budget.spent_amount || 0), 0),
    [budgets]
  );

  const budgetLimit = useMemo(
    () => budgets.reduce((sum, budget) => sum + Number(budget.limit_amount || 0), 0),
    [budgets]
  );

  const remainingBudget = useMemo(() => {
    return budgetLimit - budgetSpending;
  }, [budgetLimit, budgetSpending]);

  const budgetUsage = budgetLimit > 0 ? Math.min((budgetSpending / budgetLimit) * 100, 100) : 0;

  const currentSavings = totalIncome - totalExpenses;

  const budgetByCategory = useMemo(() => {
    return budgets
      .map((budget) => {
        const category = categories.find((item) => item.id === budget.category_id);
        const spent = Number(budget.spent_amount || 0);
        const limit = Number(budget.limit_amount || 0);
        const used = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

        return {
          id: budget.id,
          name: category?.name || 'Unknown',
          spent,
          limit,
          used,
          alert: used >= Number(budget.alert_threshold || 80),
        };
      })
      .sort((a, b) => b.used - a.used);
  }, [budgets, categories]);

  const categorySpending = useMemo(() => {
    const totals = new Map<number, number>();
    filteredExpenses.forEach((expense) => {
      totals.set(expense.category_id, (totals.get(expense.category_id) || 0) + Number(expense.amount || 0));
    });

    return Array.from(totals.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find((item) => item.id === categoryId);
        return {
          name: category?.name || 'Other',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [categories, filteredExpenses]);

  const recentTransactions = useMemo<TransactionItem[]>(() => {
    const expenseItems = filteredExpenses.map((item) => ({
      id: `expense-${item.id}`,
      type: 'Expense' as const,
      title: item.description || 'Expense',
      subtitle: item.payment_method || 'Payment',
      amount: -Number(item.amount || 0),
      date: item.date,
    }));

    const incomeItems = filteredIncome.map((item) => ({
      id: `income-${item.id}`,
      type: 'Income' as const,
      title: item.description || 'Income',
      subtitle: item.source || 'Source',
      amount: Number(item.amount || 0),
      date: item.date,
    }));

    return [...expenseItems, ...incomeItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [filteredExpenses, filteredIncome]);

  const goalProgress = useMemo(() => {
    return goals.slice(0, 3).map((goal) => {
      const currentAmount = Number(goal.current_amount || 0);
      const targetAmount = Number(goal.target_amount || 0);
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

      return {
        ...goal,
        current_amount: currentAmount,
        target_amount: targetAmount,
        progress: Math.min(progress, 100),
      };
    });
  }, [goals]);

  const summaryCards = [
    {
      title: 'Total Income',
      value: totalIncome,
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
    },
    {
      title: 'Remaining Budget',
      value: remainingBudget,
    },
    {
      title: 'Current Savings',
      value: currentSavings,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="relative z-10 flex flex-col gap-3 rounded-2xl bg-white/90 p-3 shadow-sm backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between dark:bg-card/90">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage your finances with ease</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto">
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-10 w-[220px] border-border bg-white shadow-sm dark:bg-card">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="border-border bg-white shadow-xl dark:bg-card">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 w-[280px] justify-between border-border bg-white px-3 shadow-sm dark:bg-card">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
                <span className="text-muted-foreground">⌄</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-border bg-white p-0 shadow-xl dark:bg-card" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  setPreset('custom');
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="overflow-hidden border-border shadow-sm">
            <CardContent className="bg-white p-4 dark:bg-card">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {formatCurrency(card.value)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Budget Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Track spending across household categories</p>
            </div>
            <Badge variant="outline" className="border-border">
              {budgets.length} active
            </Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="flex items-center justify-center">
                <div
                  className="relative flex h-52 w-52 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#2f855a 0% ${budgetUsage}%, #d7ead7 ${budgetUsage}% 100%)`,
                  }}
                >
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-background text-center shadow-inner">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Used</div>
                      <div className="text-2xl font-bold text-foreground">
                        {Math.round(budgetUsage)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {budgetByCategory.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    No active budgets yet
                  </div>
                ) : (
                  budgetByCategory.slice(0, 4).map((item, index) => (
                    <div key={`${item.id}-${item.name}`} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-emerald-600' : index === 1 ? 'bg-primary' : index === 2 ? 'bg-teal-500' : 'bg-lime-500'}`} />
                          <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {formatCurrency(item.spent, { maximumFractionDigits: 0 })} / {formatCurrency(item.limit, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${item.alert ? 'bg-emerald-600' : 'bg-primary'}`}
                          style={{ width: `${Math.max(item.used, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <span className="text-muted-foreground">Spending:</span> {formatCurrency(budgetSpending)}
              </div>
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <span className="text-muted-foreground">Budget limit:</span>{' '}
                {formatCurrency(budgetLimit)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <p className="text-sm text-muted-foreground">Latest income and expense activity</p>
            </div>
            <button className="text-sm font-medium text-primary hover:underline">
              View all
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No recent transactions yet
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-primary/10 text-primary'}`}>
                      {tx.type === 'Income' ? <ArrowRight className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{tx.title}</div>
                      <div className="text-sm text-muted-foreground">{tx.subtitle}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${tx.amount >= 0 ? 'text-emerald-700' : 'text-foreground'}`}>
                      {tx.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Spending Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Top spending categories this month</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySpending.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No spending data yet
              </div>
            ) : (
              categorySpending.map((item, index) => {
                const max = Math.max(...categorySpending.map((entry) => entry.amount), 1);
                const width = (item.amount / max) * 100;

                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${index === 0 ? 'bg-emerald-600' : index === 1 ? 'bg-primary' : index === 2 ? 'bg-teal-500' : 'bg-lime-500'}`}
                        style={{ width: `${Math.max(width, 10)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Financial Goals</CardTitle>
              <p className="text-sm text-muted-foreground">Progress toward household savings targets</p>
            </div>
            <Badge variant="outline" className="border-border">
              {goalProgress.length} active
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalProgress.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No financial goals set yet
              </div>
            ) : (
              goalProgress.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{goal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {goal.category} - {goal.priority} priority
                      </div>
                    </div>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.current_amount)} of {formatCurrency(goal.target_amount)}
                      </span>
                      <span className="font-semibold text-foreground">{Math.round(goal.progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
