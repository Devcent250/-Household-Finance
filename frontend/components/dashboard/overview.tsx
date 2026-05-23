'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { endOfMonth, format, isWithinInterval, startOfMonth, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Budget, Category, Expense, FinancialGoal, Income } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  Download,
  Landmark,
  PiggyBank,
  PlusCircle,
  ReceiptText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

interface OverviewProps {
  userId: string;
  onNavigate?: (tab: string) => void;
}

type TransactionItem = {
  id: string;
  type: 'Income' | 'Expense';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
};

type ActivityRow = {
  id: string;
  code: string;
  type: 'Income' | 'Expense';
  title: string;
  category: string;
  account: string;
  amount: number;
  status: 'Recorded';
  date: string;
};

const activityColumns = [
  { key: 'code', label: 'Code' },
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'title', label: 'Activity' },
  { key: 'category', label: 'Category' },
  { key: 'account', label: 'Account' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
] as const;

type ActivityColumnKey = (typeof activityColumns)[number]['key'];

const defaultActivityColumns: Record<ActivityColumnKey, boolean> = {
  code: true,
  date: true,
  type: true,
  title: true,
  category: true,
  account: true,
  amount: true,
  status: true,
};

export default function DashboardOverview({ userId, onNavigate }: OverviewProps) {
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
  const [activitySearch, setActivitySearch] = useState('');
  const [activityType, setActivityType] = useState('all');
  const [activityStatus, setActivityStatus] = useState('all');
  const [activityPage, setActivityPage] = useState(1);
  const [activityRowsPerPage, setActivityRowsPerPage] = useState(15);
  const [visibleActivityColumns, setVisibleActivityColumns] = useState(defaultActivityColumns);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

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

  useEffect(() => {
    setActivityPage(1);
    setSelectedActivityIds([]);
  }, [activitySearch, activityType, activityStatus, activityRowsPerPage, dateRange]);

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

  const remainingBudget = budgetLimit - budgetSpending;
  const budgetUsage = budgetLimit > 0 ? Math.min((budgetSpending / budgetLimit) * 100, 100) : 0;
  const currentSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (currentSavings / totalIncome) * 100 : 0;
  const expenseRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const completedGoals = goals.filter((goal) => goal.is_completed).length;
  const openGoals = Math.max(goals.length - completedGoals, 0);

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

  const activityRows = useMemo<ActivityRow[]>(() => {
    const categoryName = (categoryId: number) => categories.find((item) => item.id === categoryId)?.name || 'Uncategorized';

    const expenseRows = filteredExpenses.map((item) => ({
      id: `expense-${item.id}`,
      code: `EXP-${String(item.id).padStart(5, '0')}`,
      type: 'Expense' as const,
      title: item.description || 'Expense',
      category: categoryName(item.category_id),
      account: item.payment_method || 'Payment',
      amount: -Number(item.amount || 0),
      status: 'Recorded' as const,
      date: item.date,
    }));

    const incomeRows = filteredIncome.map((item) => ({
      id: `income-${item.id}`,
      code: `INC-${String(item.id).padStart(5, '0')}`,
      type: 'Income' as const,
      title: item.description || 'Income',
      category: categoryName(item.category_id),
      account: item.source || 'Source',
      amount: Number(item.amount || 0),
      status: 'Recorded' as const,
      date: item.date,
    }));

    return [...expenseRows, ...incomeRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [categories, filteredExpenses, filteredIncome]);

  const filteredActivityRows = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();

    return activityRows.filter((row) => {
      const matchesSearch =
        !query ||
        [row.code, row.type, row.title, row.category, row.account, row.status, row.date]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesType = activityType === 'all' || row.type.toLowerCase() === activityType;
      const matchesStatus = activityStatus === 'all' || row.status.toLowerCase() === activityStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [activityRows, activitySearch, activityType, activityStatus]);

  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityRows.length / activityRowsPerPage));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedActivityRows = filteredActivityRows.slice(
    (safeActivityPage - 1) * activityRowsPerPage,
    safeActivityPage * activityRowsPerPage
  );

  const selectedOnPage = paginatedActivityRows.filter((row) => selectedActivityIds.includes(row.id)).length;
  const allPageRowsSelected = paginatedActivityRows.length > 0 && selectedOnPage === paginatedActivityRows.length;

  const exportActivityRows = () => {
    const visibleColumns = activityColumns.filter((column) => visibleActivityColumns[column.key]);
    const worksheetRows = [
      visibleColumns.map((column) => column.label),
      ...filteredActivityRows.map((row) =>
        visibleColumns.map((column) => {
          if (column.key === 'amount') return row.amount;
          if (column.key === 'date') return format(new Date(row.date), 'yyyy-MM-dd');

          return row[column.key];
        })
      ),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);
    worksheet['!cols'] = visibleColumns.map((column) => ({
      wch: column.key === 'title' ? 28 : column.key === 'amount' ? 14 : 16,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recent Activities');
    XLSX.writeFile(workbook, `recent-activities-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const togglePageSelection = (checked: boolean) => {
    const pageIds = paginatedActivityRows.map((row) => row.id);
    setSelectedActivityIds((current) =>
      checked ? Array.from(new Set([...current, ...pageIds])) : current.filter((id) => !pageIds.includes(id))
    );
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedActivityIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  };

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

  const budgetAlerts = budgetByCategory.filter((item) => item.alert).length;
  const topCategory = categorySpending[0];
  const periodLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
      : format(dateRange.from, 'MMM d, yyyy')
    : 'All activity';
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        55 +
          (savingsRate > 0 ? Math.min(savingsRate, 30) : -20) -
          (budgetUsage > 90 ? 15 : 0) -
          budgetAlerts * 5
      )
    )
  );

  const summaryCards = [
    {
      title: 'Total Income',
      value: totalIncome,
      icon: Landmark,
      helper: `${filteredIncome.length} income entr${filteredIncome.length === 1 ? 'y' : 'ies'}`,
      progress: 100,
      tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      title: 'Total Expenses',
      value: totalExpenses,
      icon: TrendingDown,
      helper: `${filteredExpenses.length} expense entr${filteredExpenses.length === 1 ? 'y' : 'ies'}`,
      progress: Math.min(expenseRate, 100),
      tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    {
      title: 'Remaining Budget',
      value: remainingBudget,
      icon: WalletCards,
      helper: budgetLimit > 0 ? `${Math.round(100 - budgetUsage)}% budget available` : 'No active budget limit',
      progress: Math.max(100 - budgetUsage, 0),
      tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      title: 'Current Savings',
      value: currentSavings,
      icon: PiggyBank,
      helper: totalIncome > 0 ? `${Math.round(savingsRate)}% savings rate` : 'Add income to calculate rate',
      progress: Math.max(Math.min(savingsRate, 100), 0),
      tone: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Finance command center
              </Badge>
              <Badge variant="outline" className="border-border text-muted-foreground">
                {periodLabel}
              </Badge>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Dashboard</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Monitor cash flow, budgets, savings, and household goals from one focused workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onNavigate?.('expenses')} className="h-9">
                <PlusCircle className="h-4 w-4" />
                Add Expense
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.('income')} className="h-9 border-border bg-background/70">
                <TrendingUp className="h-4 w-4" />
                Add Income
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate?.('reports')} className="h-9 border-border bg-background/70">
                <ReceiptText className="h-4 w-4" />
                Reports
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[500px]">
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="h-10 border-border bg-background shadow-sm">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card shadow-xl">
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
                <Button variant="outline" className="h-10 justify-between border-border bg-background px-3 shadow-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="overflow-hidden border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <div className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
                      {formatCurrency(card.value)}
                    </div>
                  </div>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                  <p className="truncate text-xs text-muted-foreground">{card.helper}</p>
                  <span className="h-1.5 w-12 rounded-full bg-primary/20">
                    <span className="block h-1.5 rounded-full bg-primary" style={{ width: `${card.progress}%` }} />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Cash Flow Health</CardTitle>
                <p className="text-sm text-muted-foreground">Income, expenses, savings, and risk signals for the selected period.</p>
              </div>
              <Badge variant="outline" className="border-border">
                Score {healthScore}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex items-center justify-center">
              <div
                className="relative flex h-48 w-48 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(var(--primary) 0% ${healthScore}%, color-mix(in oklch, var(--muted) 80%, transparent) ${healthScore}% 100%)`,
                }}
              >
                <div className="flex h-32 w-32 items-center justify-center rounded-full border border-border bg-background text-center shadow-inner">
                  <div>
                    <ShieldCheck className="mx-auto mb-1 h-5 w-5 text-primary" />
                    <div className="text-3xl font-semibold text-foreground">{healthScore}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Health</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Savings rate</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{Math.round(savingsRate)}%</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Expense ratio</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{Math.round(expenseRate)}%</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs text-muted-foreground">Budget alerts</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{budgetAlerts}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Income coverage</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalIncome)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-emerald-600" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Expense load</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-rose-500" style={{ width: `${Math.min(expenseRate, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget used</span>
                    <span className="font-medium text-foreground">{Math.round(budgetUsage)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted">
                    <div className="h-2.5 rounded-full bg-primary" style={{ width: `${budgetUsage}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Smart Insights</CardTitle>
            <p className="text-sm text-muted-foreground">Signals generated from your current data.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Insight icon={CircleDollarSign} title="Net position">
              {currentSavings >= 0
                ? `You are ahead by ${formatCurrency(currentSavings)} in this period.`
                : `You are over by ${formatCurrency(Math.abs(currentSavings))} in this period.`}
            </Insight>
            <Insight icon={WalletCards} title="Budget control">
              {budgetLimit > 0
                ? `${formatCurrency(Math.max(remainingBudget, 0))} remains across ${budgets.length} active budget${budgets.length === 1 ? '' : 's'}.`
                : 'Create a budget to unlock spending limits and alerts.'}
            </Insight>
            <Insight icon={Target} title="Goal pipeline">
              {goals.length > 0
                ? `${openGoals} active goal${openGoals === 1 ? '' : 's'} and ${completedGoals} completed.`
                : 'Set a savings target to track progress automatically.'}
            </Insight>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-xl">Budget Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Track spending across household categories.</p>
            </div>
            <Badge variant="outline" className="border-border">{budgets.length} active</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
              <div className="flex items-center justify-center">
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) 0% ${budgetUsage}%, color-mix(in oklch, var(--muted) 85%, transparent) ${budgetUsage}% 100%)`,
                  }}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-background text-center shadow-inner">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Used</div>
                      <div className="text-2xl font-semibold text-foreground">{Math.round(budgetUsage)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {budgetByCategory.length === 0 ? (
                  <EmptyState>Create category budgets to see usage and alert thresholds here.</EmptyState>
                ) : (
                  budgetByCategory.slice(0, 5).map((item, index) => (
                    <ProgressRow
                      key={`${item.id}-${item.name}`}
                      label={item.name}
                      value={`${formatCurrency(item.spent, { maximumFractionDigits: 0 })} / ${formatCurrency(item.limit, { maximumFractionDigits: 0 })}`}
                      progress={Math.max(item.used, 5)}
                      color={item.alert ? 'bg-rose-500' : index === 1 ? 'bg-sky-500' : 'bg-primary'}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricPill label="Spending" value={formatCurrency(budgetSpending)} />
              <MetricPill label="Budget limit" value={formatCurrency(budgetLimit)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-xl">Recent Transactions</CardTitle>
              <p className="text-sm text-muted-foreground">Latest income and expense activity.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('reports')} className="text-primary hover:text-primary">
              View all
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <EmptyState>Add income or expenses to populate the activity feed.</EmptyState>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-lg p-2 ${tx.type === 'Income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-primary/10 text-primary'}`}>
                      {tx.type === 'Income' ? <ArrowRight className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{tx.title}</div>
                      <div className="truncate text-sm text-muted-foreground">{tx.subtitle}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`font-semibold ${tx.amount >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                      {tx.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Spending Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              {topCategory ? `${topCategory.name} is currently the highest spend category.` : 'Top spending categories for the selected period.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {categorySpending.length === 0 ? (
              <EmptyState>No spending data yet.</EmptyState>
            ) : (
              categorySpending.map((item, index) => {
                const max = Math.max(...categorySpending.map((entry) => entry.amount), 1);
                const width = (item.amount / max) * 100;

                return (
                  <ProgressRow
                    key={item.name}
                    label={item.name}
                    value={formatCurrency(item.amount)}
                    progress={Math.max(width, 8)}
                    color={index === 0 ? 'bg-primary' : index === 1 ? 'bg-sky-500' : index === 2 ? 'bg-amber-500' : 'bg-emerald-500'}
                  />
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div>
              <CardTitle className="text-xl">Financial Goals</CardTitle>
              <p className="text-sm text-muted-foreground">Progress toward household savings targets.</p>
            </div>
            <Badge variant="outline" className="border-border">{goalProgress.length} active</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalProgress.length === 0 ? (
              <EmptyState>No financial goals set yet.</EmptyState>
            ) : (
              goalProgress.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{goal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {goal.category} - {goal.priority} priority
                      </div>
                    </div>
                    <Target className="h-5 w-5 shrink-0 text-primary" />
                  </div>
                  <ProgressRow
                    label={`${formatCurrency(goal.current_amount)} of ${formatCurrency(goal.target_amount)}`}
                    value={`${Math.round(goal.progress)}%`}
                    progress={goal.progress}
                    color="bg-primary"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">Recent Activities</CardTitle>
                <Badge variant="outline" className="border-border">
                  {filteredActivityRows.length} rows
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Search, filter, export, and customize the activity table fields.
              </p>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-[240px] lg:w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={activitySearch}
                  onChange={(event) => setActivitySearch(event.target.value)}
                  placeholder="Search activities..."
                  className="h-10 border-border bg-background pl-9 shadow-sm"
                />
              </div>

              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="h-10 w-full border-border bg-background shadow-sm lg:w-[190px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>

              <Select value={activityStatus} onValueChange={setActivityStatus}>
                <SelectTrigger className="h-10 w-full border-border bg-background shadow-sm lg:w-[190px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="recorded">Recorded</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-10 border-border bg-background shadow-sm"
                onClick={() => {
                  setActivitySearch('');
                  setActivityType('all');
                  setActivityStatus('all');
                }}
              >
                Reset
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-10 border-border bg-background shadow-sm">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Export Excel file?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You are about to download an Excel file with {filteredActivityRows.length} recent activity row{filteredActivityRows.length === 1 ? '' : 's'} using the visible table columns.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={exportActivityRows}>
                      Download Excel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 border-border bg-background shadow-sm">
                    <SlidersHorizontal className="h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Toggle fields</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activityColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleActivityColumns[column.key]}
                      onCheckedChange={(checked) =>
                        setVisibleActivityColumns((current) => ({
                          ...current,
                          [column.key]: Boolean(checked),
                        }))
                      }
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm [&_td]:border [&_td]:border-border [&_th]:border [&_th]:border-border [&_thead_th]:border-primary-foreground/30">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="w-12 px-4 py-3 text-left">
                  <Checkbox
                    checked={allPageRowsSelected}
                    onCheckedChange={(checked) => togglePageSelection(Boolean(checked))}
                    aria-label="Select all visible rows"
                    className="border-primary-foreground/70 data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
                  />
                </th>
                <th className="w-16 px-4 py-3 text-left font-semibold">S/N</th>
                {activityColumns.map((column) =>
                  visibleActivityColumns[column.key] ? (
                    <th key={column.key} className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                      {column.label}
                    </th>
                  ) : null
                )}
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedActivityRows.length === 0 ? (
                <tr>
                  <td colSpan={activityColumns.filter((column) => visibleActivityColumns[column.key]).length + 3} className="px-4 py-10 text-center text-muted-foreground">
                    No activities match the current filters.
                  </td>
                </tr>
              ) : (
                paginatedActivityRows.map((row, index) => (
                  <tr key={row.id} className="border-b border-border bg-card transition hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedActivityIds.includes(row.id)}
                        onCheckedChange={(checked) => toggleRowSelection(row.id, Boolean(checked))}
                        aria-label={`Select ${row.code}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(safeActivityPage - 1) * activityRowsPerPage + index + 1}
                    </td>
                    {visibleActivityColumns.code && <td className="px-4 py-3 font-medium text-foreground">{row.code}</td>}
                    {visibleActivityColumns.date && (
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">
                        {format(new Date(row.date), 'MMM dd, yyyy')}
                      </td>
                    )}
                    {visibleActivityColumns.type && (
                      <td className="px-4 py-3">
                        <Badge className={row.type === 'Income' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-primary/10 text-primary hover:bg-primary/10'}>
                          {row.type}
                        </Badge>
                      </td>
                    )}
                    {visibleActivityColumns.title && <td className="max-w-[260px] truncate px-4 py-3 text-foreground">{row.title}</td>}
                    {visibleActivityColumns.category && <td className="px-4 py-3 text-muted-foreground">{row.category}</td>}
                    {visibleActivityColumns.account && <td className="px-4 py-3 text-muted-foreground">{row.account}</td>}
                    {visibleActivityColumns.amount && (
                      <td className={`whitespace-nowrap px-4 py-3 font-semibold ${row.amount >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>
                        {row.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}
                      </td>
                    )}
                    {visibleActivityColumns.status && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-emerald-700 dark:text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" />
                          {row.status}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary"
                        onClick={() => onNavigate?.(row.type === 'Income' ? 'income' : 'expenses')}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
          <div>
            {selectedActivityIds.length} of {filteredActivityRows.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Rows / page</span>
              <Select value={String(activityRowsPerPage)} onValueChange={(value) => setActivityRowsPerPage(Number(value))}>
                <SelectTrigger className="h-9 w-[110px] border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 25, 50, 100, 1000, 100000].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>
              Page {safeActivityPage} / {activityTotalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" disabled={safeActivityPage === 1} onClick={() => setActivityPage(1)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={safeActivityPage === 1} onClick={() => setActivityPage((page) => Math.max(1, page - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={safeActivityPage === activityTotalPages} onClick={() => setActivityPage((page) => Math.min(activityTotalPages, page + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" disabled={safeActivityPage === activityTotalPages} onClick={() => setActivityPage(activityTotalPages)}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Insight({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CircleDollarSign;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{children}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-background/50 px-4 py-8 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}:</span> <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  progress,
  color,
}: {
  label: string;
  value: string;
  progress: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-muted-foreground">{value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
      </div>
    </div>
  );
}
