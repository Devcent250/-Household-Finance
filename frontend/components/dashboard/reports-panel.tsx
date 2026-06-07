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
import { TableControls, TablePagination, WorkspaceCard } from './dashboard-ui';

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
    budgets, categoryById, expenseTotal, expenses, goals, income,
    incomeTotal, netBalance, remainingGoals, report?.category_totals, reportType,
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

  const isNumericHeader = (h: string) => ['amount', 'total', 'limit', 'spent', 'current', 'target', 'remaining'].some((k) => h.includes(k));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Reports</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading} className="h-8 gap-1.5 border-border bg-background text-xs">
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button size="sm" onClick={handleExportExcel} disabled={loading} className="h-8 gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export XLSX
          </Button>
        </div>
      </div>

      <WorkspaceCard
        title={currentReport?.label || 'Report'}
        description={loading ? 'Loading...' : `${filteredReportRows.length} row${filteredReportRows.length === 1 ? '' : 's'}`}
        action={
          <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <TableControls
          searchValue={reportSearch}
          onSearchChange={setReportSearch}
          searchPlaceholder="Search report rows..."
          onReset={() => setReportSearch('')}
        />
        <div className="report-print-area overflow-hidden rounded-lg border border-border">
          <h1 className="report-print-title">{currentReport?.label || 'Report'}</h1>
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">Loading report...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {reportHeader.map((header) => (
                    <TableHead key={header} className={isNumericHeader(String(header).toLowerCase()) ? 'text-right text-xs' : 'text-xs'}>
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReportRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(reportHeader.length, 1)} className="h-24 text-center text-xs text-muted-foreground">
                      No report data matches the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReportRows.map((row, rowIndex) => (
                    <TableRow key={`${reportType}-${safeReportPage}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => {
                        const header = String(reportHeader[cellIndex] || '').toLowerCase();
                        const isNumeric = isNumericHeader(header);
                        return (
                          <TableCell key={`${rowIndex}-${cellIndex}`} className={`text-xs ${isNumeric ? 'text-right font-semibold' : cellIndex === 0 ? 'font-medium' : ''}`}>
                            {renderCellValue(cell)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
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
      </WorkspaceCard>
    </div>
  );
}
