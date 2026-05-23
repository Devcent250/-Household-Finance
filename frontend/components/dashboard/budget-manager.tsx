'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, WalletCards } from 'lucide-react';
import type { Budget, Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { ActionIconButton, FeatureShell, PrimaryAction, ProgressBar, TableControls, TablePagination, WorkspaceCard } from './dashboard-ui';

interface BudgetManagerProps {
  userId: string;
}

export default function BudgetManager({ userId }: BudgetManagerProps) {
  const { formatCurrency } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [budgetSearch, setBudgetSearch] = useState('');
  const [budgetCategoryFilter, setBudgetCategoryFilter] = useState('all');
  const [budgetPeriodFilter, setBudgetPeriodFilter] = useState('all');
  const [budgetStatusFilter, setBudgetStatusFilter] = useState('all');
  const [budgetPage, setBudgetPage] = useState(1);
  const [budgetRowsPerPage, setBudgetRowsPerPage] = useState(10);
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    limit_amount: '',
    period: 'monthly',
    alert_threshold: '80',
    period_start_date: new Date().toISOString().split('T')[0],
  });

  const emptyBudgetForm = {
    category_id: '',
    limit_amount: '',
    period: 'monthly',
    alert_threshold: '80',
    period_start_date: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  useEffect(() => {
    setBudgetPage(1);
  }, [budgetSearch, budgetCategoryFilter, budgetPeriodFilter, budgetStatusFilter, budgetRowsPerPage]);

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch(apiUrl('/api/budgets'), {
          headers: { 'x-user-id': userId },
        }),
        fetch(apiUrl('/api/categories?type=expense'), {
          headers: { 'x-user-id': userId },
        }),
      ]);

      const budgetsData = await budgetsRes.json();
      const categoriesData = await categoriesRes.json();

      setBudgets(budgetsData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.category_id || !newBudget.limit_amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/budgets'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          ...newBudget,
          limit_amount: parseFloat(newBudget.limit_amount),
          alert_threshold: parseFloat(newBudget.alert_threshold),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBudgets([data.data, ...budgets]);
        setNewBudget(emptyBudgetForm);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    try {
      const response = await fetch(apiUrl(`/api/budgets/${id}`), {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        setBudgets((current) => current.filter((budget) => budget.id !== id));
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const getCategoryName = (id: number) => {
    return categories.find((cat) => cat.id === id)?.name || 'Unknown';
  };

  const filteredBudgets = useMemo(() => {
    const query = budgetSearch.trim().toLowerCase();

    return budgets.filter((budget) => {
      const categoryName = getCategoryName(budget.category_id);
      const spentAmount = Number(budget.spent_amount || 0);
      const limitAmount = Number(budget.limit_amount || 0);
      const percentage = limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;
      const isAlert = percentage >= Number(budget.alert_threshold);
      const status = isAlert ? 'alert' : 'healthy';
      const matchesSearch =
        !query ||
        [categoryName, budget.period, budget.limit_amount, budget.spent_amount, budget.alert_threshold]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = budgetCategoryFilter === 'all' || String(budget.category_id) === budgetCategoryFilter;
      const matchesPeriod = budgetPeriodFilter === 'all' || budget.period === budgetPeriodFilter;
      const matchesStatus = budgetStatusFilter === 'all' || status === budgetStatusFilter;

      return matchesSearch && matchesCategory && matchesPeriod && matchesStatus;
    });
  }, [budgetCategoryFilter, budgetPeriodFilter, budgetSearch, budgetStatusFilter, budgets, categories]);
  const budgetTotalPages = Math.max(1, Math.ceil(filteredBudgets.length / budgetRowsPerPage));
  const safeBudgetPage = Math.min(budgetPage, budgetTotalPages);
  const paginatedBudgets = filteredBudgets.slice(
    (safeBudgetPage - 1) * budgetRowsPerPage,
    safeBudgetPage * budgetRowsPerPage
  );

  if (loading) {
    return <div className="text-center py-8">Loading budgets...</div>;
  }

  return (
    <FeatureShell
      title="Budget Manager"
      description="Set spending limits, monitor usage, and catch categories before they exceed household plans."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><WalletCards className="h-4 w-4" /> Budget workspace</span>}
      actions={
        <PrimaryAction onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4" />
          Create Budget
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Budget Limits" description="Create category budgets and track actual spend against each limit.">
          <TableControls
            searchValue={budgetSearch}
            onSearchChange={setBudgetSearch}
            searchPlaceholder="Search budgets..."
            filters={[
              {
                value: budgetCategoryFilter,
                onChange: setBudgetCategoryFilter,
                placeholder: 'Category',
                options: [
                  { label: 'All categories', value: 'all' },
                  ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
                ],
              },
              {
                value: budgetPeriodFilter,
                onChange: setBudgetPeriodFilter,
                placeholder: 'Period',
                options: [
                  { label: 'All periods', value: 'all' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Yearly', value: 'yearly' },
                ],
              },
              {
                value: budgetStatusFilter,
                onChange: setBudgetStatusFilter,
                placeholder: 'Status',
                options: [
                  { label: 'All status', value: 'all' },
                  { label: 'Healthy', value: 'healthy' },
                  { label: 'Alert', value: 'alert' },
                ],
              },
            ]}
            onReset={() => {
              setBudgetSearch('');
              setBudgetCategoryFilter('all');
              setBudgetPeriodFilter('all');
              setBudgetStatusFilter('all');
            }}
          />
            <div className="overflow-hidden rounded-xl border border-border">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Category</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Budget Limit</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead className="min-w-[180px]">Usage</TableHead>
                    <TableHead className="w-16 px-4 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBudgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No budgets match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : paginatedBudgets.map((budget) => {
                    const spentAmount = Number(budget.spent_amount || 0);
                    const limitAmount = Number(budget.limit_amount);
                    const percentage = limitAmount > 0 ? Math.min((spentAmount / limitAmount) * 100, 100) : 0;
                    const isAlert = percentage >= Number(budget.alert_threshold);

                    return (
                      <TableRow key={budget.id}>
                        <TableCell className="px-4 font-semibold text-foreground">
                          {getCategoryName(budget.category_id)}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {budget.period}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(limitAmount)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {formatCurrency(spentAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-[160px] items-center gap-3">
                            <div className="flex-1">
                              <ProgressBar value={percentage} tone={isAlert ? 'bg-destructive' : 'bg-primary'} />
                            </div>
                            <span className={`w-16 text-right font-medium ${isAlert ? 'text-destructive' : 'text-green-600'}`}>
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <ActionIconButton
                            label="Delete budget"
                            tone="danger"
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </ActionIconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
                page={safeBudgetPage}
                totalPages={budgetTotalPages}
                rowsPerPage={budgetRowsPerPage}
                totalRows={filteredBudgets.length}
                onPageChange={setBudgetPage}
                onRowsPerPageChange={setBudgetRowsPerPage}
              />
            </div>
      </WorkspaceCard>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-3xl">
          <form onSubmit={handleAddBudget}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <WalletCards className="h-4 w-4" />
                  Budget entry
                </div>
                <DialogTitle className="text-2xl">Create budget</DialogTitle>
                <DialogDescription>Define the category limit, period, and alert threshold for spending control.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget-category">Category</Label>
                <Select value={newBudget.category_id} onValueChange={(value) => setNewBudget({ ...newBudget, category_id: value })}>
                  <SelectTrigger id="budget-category" className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-limit">Budget Limit</Label>
                <Input id="budget-limit" type="number" placeholder="0.00" value={newBudget.limit_amount} onChange={(e) => setNewBudget({ ...newBudget, limit_amount: e.target.value })} step="0.01" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-period">Period</Label>
                <Select value={newBudget.period} onValueChange={(value) => setNewBudget({ ...newBudget, period: value })}>
                  <SelectTrigger id="budget-period" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-threshold">Alert Threshold (%)</Label>
                <Input id="budget-threshold" type="number" placeholder="80" value={newBudget.alert_threshold} onChange={(e) => setNewBudget({ ...newBudget, alert_threshold: e.target.value })} min="0" max="100" className="h-11" />
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <PrimaryAction type="submit">Create Budget</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
