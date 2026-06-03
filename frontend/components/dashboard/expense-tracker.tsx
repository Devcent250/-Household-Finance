'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, CreditCard, Eye, FileText, Pencil, Plus, ReceiptText, Tags, Trash2, WalletCards } from 'lucide-react';
import type { Expense, Category } from '@/lib/types';
import { apiFetch, apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { ActionIconButton, EmptyState, FeatureShell, MetricStrip, PrimaryAction, TableControls, TablePagination, WorkspaceCard } from './dashboard-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ExpenseTrackerProps {
  userId: string;
}

const paymentMethods = ['Cash', 'Debit Card', 'Credit Card', 'Bank Transfer', 'Mobile Money', 'Digital Wallet'];

export default function ExpenseTracker({ userId }: ExpenseTrackerProps) {
  const { formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expenseFormStep, setExpenseFormStep] = useState(1);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseMethodFilter, setExpenseMethodFilter] = useState('all');
  const [expensePage, setExpensePage] = useState(1);
  const [expenseRowsPerPage, setExpenseRowsPerPage] = useState(10);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  });

  const emptyExpenseForm = {
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: '',
    notes: '',
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  useEffect(() => {
    setExpensePage(1);
  }, [expenseSearch, expenseCategoryFilter, expenseMethodFilter, expenseRowsPerPage]);

  const fetchData = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const [expensesRes, categoriesRes] = await Promise.all([
        apiFetch(`/api/expenses?month=${month}&year=${year}`, userId),
        apiFetch('/api/categories?type=expense', userId),
      ]);

      const expensesData = await expensesRes.json();
      const categoriesData = await categoriesRes.json();

      setExpenses(expensesData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewExpense(emptyExpenseForm);
    setEditingExpenseId(null);
    setExpenseFormStep(1);
    setShowForm(false);
  };

  const openAddExpenseModal = () => {
    setNewExpense(emptyExpenseForm);
    setEditingExpenseId(null);
    setExpenseFormStep(1);
    setShowForm(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.category_id || !newExpense.amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await apiFetch(editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses', userId, {
        method: editingExpenseId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses((current) => (
          editingExpenseId
            ? current.map((expense) => (expense.id === editingExpenseId ? data.data : expense))
            : [data.data, ...current]
        ));
        resetForm();
      }
    } catch (error) {
      console.error('Error saving expense:', error);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setNewExpense({
      category_id: expense.category_id.toString(),
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: new Date(expense.date).toISOString().split('T')[0],
      payment_method: expense.payment_method || '',
      notes: expense.notes || '',
    });
    setExpenseFormStep(1);
    setShowForm(true);
  };

  const handleDeleteExpense = async (id: number) => {
    try {
    const response = await apiFetch(`/api/expenses/${id}`, userId, { method: 'DELETE' });

      if (response.ok) {
        setExpenses((current) => current.filter((expense) => expense.id !== id));
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const getCategoryName = (id: number) => categories.find((category) => category.id === id)?.name || 'Uncategorized';
  const filteredExpenses = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();

    return expenses.filter((expense) => {
      const categoryName = getCategoryName(expense.category_id);
      const matchesSearch =
        !query ||
        [
          expense.description,
          expense.notes,
          categoryName,
          expense.payment_method,
          expense.date,
          expense.amount,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = expenseCategoryFilter === 'all' || String(expense.category_id) === expenseCategoryFilter;
      const matchesMethod = expenseMethodFilter === 'all' || (expense.payment_method || '') === expenseMethodFilter;

      return matchesSearch && matchesCategory && matchesMethod;
    });
  }, [categories, expenseCategoryFilter, expenseMethodFilter, expenseSearch, expenses]);
  const expenseTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / expenseRowsPerPage));
  const safeExpensePage = Math.min(expensePage, expenseTotalPages);
  const paginatedExpenses = filteredExpenses.slice(
    (safeExpensePage - 1) * expenseRowsPerPage,
    safeExpensePage * expenseRowsPerPage
  );
  const canContinueExpenseForm = expenseFormStep === 1 ? Boolean(newExpense.category_id && newExpense.amount) : true;
  const expenseSteps = [
    { id: 1, label: 'Details' },
    { id: 2, label: 'Notes' },
    { id: 3, label: 'Review' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading expenses...</div>;
  }

  return (
    <FeatureShell
      title="Expense Tracker"
      description="Record outgoing transactions, review payment methods, and keep monthly spending under control."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><ReceiptText className="h-4 w-4" /> Expense workspace</span>}
      actions={
        <PrimaryAction
          onClick={openAddExpenseModal}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Expense Register" description="Add, edit, inspect, and remove expense entries for this month.">
        <MetricStrip label="Total Expenses This Month" value={formatCurrency(totalExpenses)} tone="text-destructive" />
          <TableControls
            searchValue={expenseSearch}
            onSearchChange={setExpenseSearch}
            searchPlaceholder="Search expenses..."
            filters={[
              {
                value: expenseCategoryFilter,
                onChange: setExpenseCategoryFilter,
                placeholder: 'Category',
                options: [
                  { label: 'All categories', value: 'all' },
                  ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
                ],
              },
              {
                value: expenseMethodFilter,
                onChange: setExpenseMethodFilter,
                placeholder: 'Method',
                options: [
                  { label: 'All methods', value: 'all' },
                  ...paymentMethods.map((method) => ({ label: method, value: method })),
                ],
              },
            ]}
            onReset={() => {
              setExpenseSearch('');
              setExpenseCategoryFilter('all');
              setExpenseMethodFilter('all');
            }}
          />

          {filteredExpenses.length === 0 ? (
            <EmptyState title="No expenses match the current filters" description="Adjust the search or filters, or add a new expense." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium text-foreground">{expense.description || 'Untitled'}</TableCell>
                      <TableCell>{getCategoryName(expense.category_id)}</TableCell>
                      <TableCell>{expense.payment_method || 'No payment method'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(expense.amount))}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <ActionIconButton
                            label="View expense details"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton
                            label="Edit expense"
                            tone="primary"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton
                            label="Delete expense"
                            tone="danger"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </ActionIconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={safeExpensePage}
                totalPages={expenseTotalPages}
                rowsPerPage={expenseRowsPerPage}
                totalRows={filteredExpenses.length}
                onPageChange={setExpensePage}
                onRowsPerPageChange={setExpenseRowsPerPage}
              />
            </div>
          )}
      </WorkspaceCard>

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : resetForm())}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-5xl">
          <form onSubmit={handleSaveExpense}>
            <div className="border-b border-border bg-card px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <DialogHeader>
                  <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                    <ReceiptText className="h-4 w-4" />
                    Expense entry
                  </div>
                  <DialogTitle className="text-2xl">
                    {editingExpenseId ? 'Edit expense' : 'Add expense'}
                  </DialogTitle>
                  <DialogDescription>
                    Capture the transaction details that will appear in your expense register and reports.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Step</span>{' '}
                  <span className="font-semibold text-foreground">{expenseFormStep} of {expenseSteps.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-8 py-6">
              <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="flex items-center">
                  {expenseSteps.map((step, index) => (
                    <div key={step.id} className="flex flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => setExpenseFormStep(step.id)}
                      className={`group flex min-w-0 items-center gap-3 rounded-lg pr-3 text-left transition ${
                        expenseFormStep === step.id
                          ? 'text-primary'
                          : expenseFormStep > step.id
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition ${
                        expenseFormStep === step.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : expenseFormStep > step.id
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground group-hover:border-primary/40'
                      }`}>
                        {step.id}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{step.label}</span>
                        <span className="hidden truncate text-xs text-muted-foreground sm:block">
                          {step.id === 1 ? 'Required fields' : step.id === 2 ? 'Optional context' : 'Confirm and save'}
                        </span>
                      </span>
                    </button>
                    {index < expenseSteps.length - 1 ? (
                      <div className={`mr-4 h-0.5 flex-1 rounded-full ${expenseFormStep > step.id ? 'bg-primary' : 'bg-border'}`} />
                    ) : null}
                  </div>
                  ))}
                </div>
              </div>

              {expenseFormStep === 1 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <WalletCards className="h-4 w-4 text-primary" />
                    Transaction details
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-category" className="inline-flex items-center gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground" />
                        Category
                      </Label>
                      <Select value={newExpense.category_id} onValueChange={(value) => setNewExpense({ ...newExpense, category_id: value })}>
                        <SelectTrigger id="expense-category" className="h-11">
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
                      <Label htmlFor="expense-amount">Amount</Label>
                      <Input
                        id="expense-amount"
                        type="number"
                        placeholder="0.00"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        step="0.01"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense-date" className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        Date
                      </Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expense-payment" className="inline-flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        Payment Method
                      </Label>
                      <Select
                        value={newExpense.payment_method}
                        onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value })}
                      >
                        <SelectTrigger id="expense-payment" className="h-11 w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
              )}

              {expenseFormStep === 2 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Description and notes
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="expense-description">Description</Label>
                      <Input
                        id="expense-description"
                        placeholder="Enter expense description"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-notes">Notes</Label>
                      <Input
                        id="expense-notes"
                        placeholder="Additional notes"
                        value={newExpense.notes}
                        onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>
                </section>
              )}

              {expenseFormStep === 3 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <ReceiptText className="h-4 w-4 text-primary" />
                    Review expense
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="text-muted-foreground">Category</div>
                      <div className="font-medium text-foreground">{newExpense.category_id ? getCategoryName(Number(newExpense.category_id)) : 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="text-muted-foreground">Amount</div>
                      <div className="font-medium text-foreground">{newExpense.amount ? formatCurrency(Number(newExpense.amount)) : formatCurrency(0)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="text-muted-foreground">Date</div>
                      <div className="font-medium text-foreground">{new Date(newExpense.date).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card px-3 py-2">
                      <div className="text-muted-foreground">Payment Method</div>
                      <div className="font-medium text-foreground">{newExpense.payment_method || 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2 md:col-span-3">
                      <div className="text-muted-foreground">Description</div>
                      <div className="font-medium text-foreground">{newExpense.description || 'Untitled'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2 md:col-span-3">
                      <div className="text-muted-foreground">Notes</div>
                      <div className="font-medium text-foreground">{newExpense.notes || 'No notes'}</div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-card px-8 py-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              {expenseFormStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setExpenseFormStep((step) => Math.max(1, step - 1))}>
                  Back
                </Button>
              )}
              {expenseFormStep < 3 ? (
                <PrimaryAction
                  type="button"
                  disabled={!canContinueExpenseForm}
                  onClick={() => setExpenseFormStep((step) => Math.min(3, step + 1))}
                >
                  Continue
                </PrimaryAction>
              ) : (
                <PrimaryAction type="submit">
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </PrimaryAction>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedExpense)} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-foreground">{selectedExpense.description || 'Untitled'}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Category</span>
                <span>{getCategoryName(selectedExpense.category_id)}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selectedExpense.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Payment Method</span>
                <span>{selectedExpense.payment_method || 'No payment method'}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatCurrency(Number(selectedExpense.amount))}</span>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">Notes</div>
                <div className="rounded-md bg-muted p-3">{selectedExpense.notes || 'No notes'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
