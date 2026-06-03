'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, ReceiptText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import type { Budget, Category, Expense, FinancialGoal, Income } from '@/lib/types';
import { FeatureShell, PrimaryAction, TableControls, TablePagination, WorkspaceCard } from './dashboard-ui';

interface ReportsPanelProps {
  userId: string;
}

interface ReportData {
  total_income: string;
  total_expenses: string;
  remaining_goals: string;
  category_totals: Array<{ name: string; color: string; amount: string }>;
}

type ReportType = 'summary' | 'categories' | 'expenses' | 'income' | 'budgets' | 'goals';
type ReportCell = string | number;

const reportTypes: Array<{ value: ReportType; label: string }> = [
  { value: 'summary', label: 'Financial Summary' },
  { value: 'categories', label: 'Expense Categories' },
  { value: 'expenses', label: 'Expense Transactions' },
  { value: 'income', label: 'Income Transactions' },
  { value: 'budgets', label: 'Budget Usage' },
  { value: 'goals', label: 'Financial Goals' },
];

export default function ReportsPanel({ userId }: ReportsPanelProps) {
  const { formatCurrency } = useCurrency();
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [report, setReport] = useState<ReportData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportSearch, setReportSearch] = useState('');
  const [reportPage, setReportPage] = useState(1);
  const [reportRowsPerPage, setReportRowsPerPage] = useState(10);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/reports', userId),
      apiFetch('/api/expenses', userId),
      apiFetch('/api/income', userId),
      apiFetch('/api/budgets', userId),
      apiFetch('/api/goals', userId),
      apiFetch('/api/categories', userId),
    ])
      .then(async ([reportRes, expensesRes, incomeRes, budgetsRes, goalsRes, categoriesRes]) => {
        const [reportData, expensesData, incomeData, budgetsData, goalsData, categoriesData] = await Promise.all([
          reportRes.json(),
          expensesRes.json(),
          incomeRes.json(),
          budgetsRes.json(),
          goalsRes.json(),
          categoriesRes.json(),
        ]);

        setReport(reportData.data || null);
        setExpenses(expensesData.data || []);
        setIncome(incomeData.data || []);
        setBudgets(budgetsData.data || []);
        setGoals(goalsData.data || []);
        setCategories(categoriesData.data || []);
      })
      .catch((error) => console.error('Error fetching reports:', error))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    setReportPage(1);
    setReportSearch('');
  }, [reportType]);

  useEffect(() => {
    setReportPage(1);
  }, [reportSearch, reportRowsPerPage]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const incomeTotal = Number(report?.total_income || 0);
  const expenseTotal = Number(report?.total_expenses || 0);
  const netBalance = incomeTotal - expenseTotal;
  const remainingGoals = Number(report?.remaining_goals || 0);
  const currentReport = reportTypes.find((item) => item.value === reportType);

  const exportRows = useMemo<ReportCell[][]>(() => {
    switch (reportType) {
      case 'categories':
        return [
          ['Expense Category', 'Share', 'Total'],
          ...(report?.category_totals || []).map((category) => {
            const amount = Number(category.amount || 0);
            const share = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;
            return [category.name, `${share.toFixed(1)}%`, amount];
          }),
        ];
      case 'expenses':
        return [
          ['Date', 'Description', 'Category', 'Payment Method', 'Amount'],
          ...expenses.map((expense) => [
            new Date(expense.date).toLocaleDateString(),
            expense.description || 'Untitled',
            categoryById.get(expense.category_id) || 'Unknown',
            expense.payment_method || 'Not set',
            Number(expense.amount || 0),
          ]),
        ];
      case 'income':
        return [
          ['Date', 'Description', 'Category', 'Source', 'Amount'],
          ...income.map((item) => [
            new Date(item.date).toLocaleDateString(),
            item.description || 'Untitled',
            categoryById.get(item.category_id) || 'Unknown',
            item.source || 'Not set',
            Number(item.amount || 0),
          ]),
        ];
      case 'budgets':
        return [
          ['Category', 'Period', 'Limit', 'Spent', 'Remaining'],
          ...budgets.map((budget) => {
            const limit = Number(budget.limit_amount || 0);
            const spent = Number(budget.spent_amount || 0);
            return [
              categoryById.get(budget.category_id) || 'Unknown',
              budget.period,
              limit,
              spent,
              limit - spent,
            ];
          }),
        ];
      case 'goals':
        return [
          ['Goal', 'Priority', 'Deadline', 'Current', 'Target'],
          ...goals.map((goal) => [
            goal.name,
            goal.priority,
            goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Not set',
            Number(goal.current_amount || 0),
            Number(goal.target_amount || 0),
          ]),
        ];
      case 'summary':
      default:
        return [
          ['Metric', 'Description', 'Amount'],
          ['Total Income', 'All recorded income', incomeTotal],
          ['Total Expenses', 'All recorded expenses', expenseTotal],
          ['Net Balance', 'Income minus expenses', netBalance],
          ['Remaining Goals', 'Open goal amount still required', remainingGoals],
        ];
    }
  }, [
    budgets,
    categoryById,
    expenseTotal,
    expenses,
    goals,
    income,
    incomeTotal,
    netBalance,
    remainingGoals,
    report?.category_totals,
    reportType,
  ]);

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(exportRows);
    const sheetName = currentReport?.label.slice(0, 31) || 'Report';
    const fileName = `${reportType}-report.xlsx`;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportHeader = exportRows[0] || [];
  const filteredReportRows = useMemo(() => {
    const query = reportSearch.trim().toLowerCase();
    const rows = exportRows.slice(1);

    if (!query) return rows;

    return rows.filter((row) => row.join(' ').toLowerCase().includes(query));
  }, [exportRows, reportSearch]);
  const reportTotalPages = Math.max(1, Math.ceil(filteredReportRows.length / reportRowsPerPage));
  const safeReportPage = Math.min(reportPage, reportTotalPages);
  const paginatedReportRows = filteredReportRows.slice(
    (safeReportPage - 1) * reportRowsPerPage,
    safeReportPage * reportRowsPerPage
  );

  const renderCellValue = (value: ReportCell) => (typeof value === 'number' ? formatCurrency(value) : value);

  const renderCurrentReportTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          {reportHeader.map((header) => (
            <TableHead key={header} className={String(header).toLowerCase().includes('amount') || String(header).toLowerCase().includes('total') || String(header).toLowerCase().includes('limit') || String(header).toLowerCase().includes('spent') || String(header).toLowerCase().includes('current') || String(header).toLowerCase().includes('target') || String(header).toLowerCase().includes('remaining') ? 'text-right' : undefined}>
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedReportRows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={Math.max(reportHeader.length, 1)} className="h-24 text-center text-muted-foreground">
              No report data matches the current filters.
            </TableCell>
          </TableRow>
        ) : (
          paginatedReportRows.map((row, rowIndex) => (
            <TableRow key={`${reportType}-${safeReportPage}-${rowIndex}`}>
              {row.map((cell, cellIndex) => {
                const header = String(reportHeader[cellIndex] || '').toLowerCase();
                const isNumericColumn =
                  header.includes('amount') ||
                  header.includes('total') ||
                  header.includes('limit') ||
                  header.includes('spent') ||
                  header.includes('current') ||
                  header.includes('target') ||
                  header.includes('remaining');

                return (
                  <TableCell key={`${rowIndex}-${cellIndex}`} className={isNumericColumn ? 'text-right font-semibold' : cellIndex === 0 ? 'font-medium' : undefined}>
                    {renderCellValue(cell)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderEmpty = () => (
    <TableRow>
      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
        No report data available.
      </TableCell>
    </TableRow>
  );

  const renderSummary = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Metric</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="px-4 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="px-4 font-semibold">Total Income</TableCell>
          <TableCell className="text-muted-foreground">All recorded income</TableCell>
          <TableCell className="px-4 text-right font-semibold text-green-600">{formatCurrency(incomeTotal)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-4 font-semibold">Total Expenses</TableCell>
          <TableCell className="text-muted-foreground">All recorded expenses</TableCell>
          <TableCell className="px-4 text-right font-semibold text-destructive">{formatCurrency(expenseTotal)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-4 font-semibold">Net Balance</TableCell>
          <TableCell className="text-muted-foreground">Income minus expenses</TableCell>
          <TableCell className="px-4 text-right font-semibold">{formatCurrency(netBalance)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-4 font-semibold">Remaining Goals</TableCell>
          <TableCell className="text-muted-foreground">Open goal amount still required</TableCell>
          <TableCell className="px-4 text-right font-semibold">{formatCurrency(remainingGoals)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  const renderCategories = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Expense Category</TableHead>
          <TableHead className="text-right">Share</TableHead>
          <TableHead className="px-4 text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(report?.category_totals || []).length === 0 ? renderEmpty() : (report?.category_totals || []).map((category) => {
          const amount = Number(category.amount || 0);
          const share = expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0;

          return (
            <TableRow key={category.name}>
              <TableCell className="px-4 font-medium">{category.name}</TableCell>
              <TableCell className="text-right">{share.toFixed(1)}%</TableCell>
              <TableCell className="px-4 text-right font-semibold">{formatCurrency(amount)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderExpenses = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Payment Method</TableHead>
          <TableHead className="px-4 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.length === 0 ? renderEmpty() : expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell className="px-4">{new Date(expense.date).toLocaleDateString()}</TableCell>
            <TableCell className="font-medium">{expense.description || 'Untitled'}</TableCell>
            <TableCell>{categoryById.get(expense.category_id) || 'Unknown'}</TableCell>
            <TableCell>{expense.payment_method || 'Not set'}</TableCell>
            <TableCell className="px-4 text-right font-semibold">{formatCurrency(Number(expense.amount || 0))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderIncome = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Source</TableHead>
          <TableHead className="px-4 text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {income.length === 0 ? renderEmpty() : income.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="px-4">{new Date(item.date).toLocaleDateString()}</TableCell>
            <TableCell className="font-medium">{item.description || 'Untitled'}</TableCell>
            <TableCell>{categoryById.get(item.category_id) || 'Unknown'}</TableCell>
            <TableCell>{item.source || 'Not set'}</TableCell>
            <TableCell className="px-4 text-right font-semibold text-green-600">{formatCurrency(Number(item.amount || 0))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderBudgets = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Category</TableHead>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Limit</TableHead>
          <TableHead className="text-right">Spent</TableHead>
          <TableHead className="px-4 text-right">Remaining</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {budgets.length === 0 ? renderEmpty() : budgets.map((budget) => {
          const limit = Number(budget.limit_amount || 0);
          const spent = Number(budget.spent_amount || 0);

          return (
            <TableRow key={budget.id}>
              <TableCell className="px-4 font-medium">{categoryById.get(budget.category_id) || 'Unknown'}</TableCell>
              <TableCell className="capitalize">{budget.period}</TableCell>
              <TableCell className="text-right">{formatCurrency(limit)}</TableCell>
              <TableCell className="text-right">{formatCurrency(spent)}</TableCell>
              <TableCell className="px-4 text-right font-semibold">{formatCurrency(limit - spent)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderGoals = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Goal</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Deadline</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="px-4 text-right">Target</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {goals.length === 0 ? renderEmpty() : goals.map((goal) => (
          <TableRow key={goal.id}>
            <TableCell className="px-4 font-medium">{goal.name}</TableCell>
            <TableCell className="capitalize">{goal.priority}</TableCell>
            <TableCell>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Not set'}</TableCell>
            <TableCell className="text-right">{formatCurrency(Number(goal.current_amount || 0))}</TableCell>
            <TableCell className="px-4 text-right font-semibold">{formatCurrency(Number(goal.target_amount || 0))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <FeatureShell
      title="Reports"
      description="Generate printable and exportable reports for summaries, transactions, budgets, and goals."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><ReceiptText className="h-4 w-4" /> Reporting workspace</span>}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={loading} className="gap-2 border-border bg-background">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <PrimaryAction onClick={handleExportExcel} disabled={loading} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Export XLSX
          </PrimaryAction>
        </div>
      }
    >
      <WorkspaceCard title={currentReport?.label || 'Report'} description="Choose the report type, then print or export the visible data.">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
          <div className="w-full space-y-2 sm:w-[320px]">
            <div className="text-sm font-medium text-foreground">Choose report</div>
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <TableControls
          searchValue={reportSearch}
          onSearchChange={setReportSearch}
          searchPlaceholder="Search report rows..."
          onReset={() => setReportSearch('')}
        />
        <div className="report-print-area overflow-hidden rounded-xl border border-border">
          <h1 className="report-print-title">{currentReport?.label || 'Report'}</h1>
          {loading && (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading report...</div>
          )}
          {!loading && renderCurrentReportTable()}
          {!loading && (
            <TablePagination
              page={safeReportPage}
              totalPages={reportTotalPages}
              rowsPerPage={reportRowsPerPage}
              totalRows={filteredReportRows.length}
              onPageChange={setReportPage}
              onRowsPerPageChange={setReportRowsPerPage}
            />
          )}
        </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
