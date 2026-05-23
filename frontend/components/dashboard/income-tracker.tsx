'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Eye, FileText, Landmark, Pencil, Plus, Tags, Trash2, TrendingUp, WalletCards } from 'lucide-react';
import type { Income, Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { ActionIconButton, FeatureShell, MetricStrip, PrimaryAction, TableControls, TablePagination, WorkspaceCard } from './dashboard-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface IncomeTrackerProps {
  userId: string;
}

const incomeSources = ['Salary', 'Freelance', 'Business', 'Investment', 'Rental Income', 'Gift', 'Refund', 'Other'];

export default function IncomeTracker({ userId }: IncomeTrackerProps) {
  const { formatCurrency } = useCurrency();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [incomeFormStep, setIncomeFormStep] = useState(1);
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('all');
  const [incomeSourceFilter, setIncomeSourceFilter] = useState('all');
  const [incomePage, setIncomePage] = useState(1);
  const [incomeRowsPerPage, setIncomeRowsPerPage] = useState(10);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const emptyIncomeForm = {
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    notes: '',
  };
  const [newIncome, setNewIncome] = useState({
    ...emptyIncomeForm,
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

  useEffect(() => {
    setIncomePage(1);
  }, [incomeSearch, incomeCategoryFilter, incomeSourceFilter, incomeRowsPerPage]);

  const fetchData = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const [incomeRes, categoriesRes] = await Promise.all([
        fetch(apiUrl(`/api/income?month=${month}&year=${year}`), {
          headers: { 'x-user-id': userId },
        }),
        fetch(apiUrl('/api/categories?type=income'), {
          headers: { 'x-user-id': userId },
        }),
      ]);

      const incomeData = await incomeRes.json();
      const categoriesData = await categoriesRes.json();

      setIncomes(incomeData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewIncome(emptyIncomeForm);
    setEditingIncomeId(null);
    setIncomeFormStep(1);
    setShowForm(false);
  };

  const openAddIncomeModal = () => {
    setNewIncome(emptyIncomeForm);
    setEditingIncomeId(null);
    setIncomeFormStep(1);
    setShowForm(true);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.category_id || !newIncome.amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(apiUrl(editingIncomeId ? `/api/income/${editingIncomeId}` : '/api/income'), {
        method: editingIncomeId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(newIncome),
      });

      if (response.ok) {
        const data = await response.json();
        setIncomes((current) => (
          editingIncomeId
            ? current.map((income) => (income.id === editingIncomeId ? data.data : income))
            : [data.data, ...current]
        ));
        resetForm();
      }
    } catch (error) {
      console.error('Error saving income:', error);
    }
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncomeId(income.id);
    setNewIncome({
      category_id: income.category_id.toString(),
      amount: income.amount.toString(),
      description: income.description || '',
      date: new Date(income.date).toISOString().split('T')[0],
      source: income.source || '',
      notes: income.notes || '',
    });
    setIncomeFormStep(1);
    setShowForm(true);
  };

  const handleDeleteIncome = async (id: number) => {
    try {
      const response = await fetch(apiUrl(`/api/income/${id}`), {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        setIncomes((current) => current.filter((income) => income.id !== id));
      }
    } catch (error) {
      console.error('Error deleting income:', error);
    }
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount.toString()), 0);
  const getCategoryName = (id: number) => categories.find((category) => category.id === id)?.name || 'Uncategorized';
  const filteredIncomes = useMemo(() => {
    const query = incomeSearch.trim().toLowerCase();

    return incomes.filter((income) => {
      const categoryName = getCategoryName(income.category_id);
      const matchesSearch =
        !query ||
        [income.description, income.notes, categoryName, income.source, income.date, income.amount]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesCategory = incomeCategoryFilter === 'all' || String(income.category_id) === incomeCategoryFilter;
      const matchesSource = incomeSourceFilter === 'all' || (income.source || '') === incomeSourceFilter;

      return matchesSearch && matchesCategory && matchesSource;
    });
  }, [categories, incomeCategoryFilter, incomeSearch, incomeSourceFilter, incomes]);
  const incomeTotalPages = Math.max(1, Math.ceil(filteredIncomes.length / incomeRowsPerPage));
  const safeIncomePage = Math.min(incomePage, incomeTotalPages);
  const paginatedIncomes = filteredIncomes.slice(
    (safeIncomePage - 1) * incomeRowsPerPage,
    safeIncomePage * incomeRowsPerPage
  );
  const canContinueIncomeForm = incomeFormStep === 1 ? Boolean(newIncome.category_id && newIncome.amount) : true;
  const incomeSteps = [
    { id: 1, label: 'Details' },
    { id: 2, label: 'Notes' },
    { id: 3, label: 'Review' },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading income...</div>;
  }

  return (
    <FeatureShell
      title="Income Tracker"
      description="Capture household income, organize sources, and maintain a clean record of incoming cash flow."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><TrendingUp className="h-4 w-4" /> Income workspace</span>}
      actions={
        <PrimaryAction
          onClick={openAddIncomeModal}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Income
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Income Register" description="Add, edit, inspect, and remove income entries for this month.">
        <MetricStrip label="Total Income This Month" value={formatCurrency(totalIncome)} tone="text-emerald-700 dark:text-emerald-300" />
          <TableControls
            searchValue={incomeSearch}
            onSearchChange={setIncomeSearch}
            searchPlaceholder="Search income..."
            filters={[
              {
                value: incomeCategoryFilter,
                onChange: setIncomeCategoryFilter,
                placeholder: 'Category',
                options: [
                  { label: 'All categories', value: 'all' },
                  ...categories.map((category) => ({ label: category.name, value: String(category.id) })),
                ],
              },
              {
                value: incomeSourceFilter,
                onChange: setIncomeSourceFilter,
                placeholder: 'Source',
                options: [
                  { label: 'All sources', value: 'all' },
                  ...incomeSources.map((source) => ({ label: source, value: source })),
                ],
              },
            ]}
            onReset={() => {
              setIncomeSearch('');
              setIncomeCategoryFilter('all');
              setIncomeSourceFilter('all');
            }}
          />

          <div className="overflow-hidden rounded-xl border border-border">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncomes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No income matches the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIncomes.map((income) => (
                      <TableRow key={income.id}>
                        <TableCell>{new Date(income.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-foreground">{income.description || 'Untitled'}</TableCell>
                        <TableCell>{getCategoryName(income.category_id)}</TableCell>
                        <TableCell>{income.source || 'No source'}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700 dark:text-emerald-300">{formatCurrency(Number(income.amount))}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <ActionIconButton
                              label="View income details"
                              onClick={() => setSelectedIncome(income)}
                            >
                              <Eye className="h-4 w-4" />
                            </ActionIconButton>
                            <ActionIconButton
                              label="Edit income"
                              tone="primary"
                              onClick={() => handleEditIncome(income)}
                            >
                              <Pencil className="h-4 w-4" />
                            </ActionIconButton>
                            <ActionIconButton
                              label="Delete income"
                              tone="danger"
                              onClick={() => handleDeleteIncome(income.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ActionIconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              page={safeIncomePage}
              totalPages={incomeTotalPages}
              rowsPerPage={incomeRowsPerPage}
              totalRows={filteredIncomes.length}
              onPageChange={setIncomePage}
              onRowsPerPageChange={setIncomeRowsPerPage}
            />
          </div>
      </WorkspaceCard>

      <Dialog open={showForm} onOpenChange={(open) => (open ? setShowForm(true) : resetForm())}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-5xl">
          <form onSubmit={handleSaveIncome}>
            <div className="border-b border-border bg-card px-8 py-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <DialogHeader>
                  <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                    <TrendingUp className="h-4 w-4" />
                    Income entry
                  </div>
                  <DialogTitle className="text-2xl">
                    {editingIncomeId ? 'Edit income' : 'Add income'}
                  </DialogTitle>
                  <DialogDescription>
                    Capture income details that will appear in your register, reports, and dashboard totals.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Step</span>{' '}
                  <span className="font-semibold text-foreground">{incomeFormStep} of {incomeSteps.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-5 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-8 py-6">
              <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="flex items-center">
                  {incomeSteps.map((step, index) => (
                    <div key={step.id} className="flex flex-1 items-center">
                      <button
                        type="button"
                        onClick={() => setIncomeFormStep(step.id)}
                        className={`group flex min-w-0 items-center gap-3 rounded-lg pr-3 text-left transition ${
                          incomeFormStep === step.id
                            ? 'text-primary'
                            : incomeFormStep > step.id
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition ${
                          incomeFormStep === step.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : incomeFormStep > step.id
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
                      {index < incomeSteps.length - 1 ? (
                        <div className={`mr-4 h-0.5 flex-1 rounded-full ${incomeFormStep > step.id ? 'bg-primary' : 'bg-border'}`} />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {incomeFormStep === 1 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <WalletCards className="h-4 w-4 text-primary" />
                    Income details
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="income-category" className="inline-flex items-center gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground" />
                        Category
                      </Label>
                      <Select value={newIncome.category_id} onValueChange={(value) => setNewIncome({ ...newIncome, category_id: value })}>
                        <SelectTrigger id="income-category" className="h-11">
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
                      <Label htmlFor="income-amount">Amount</Label>
                      <Input
                        id="income-amount"
                        type="number"
                        placeholder="0.00"
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                        step="0.01"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="income-date" className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        Date
                      </Label>
                      <Input
                        id="income-date"
                        type="date"
                        value={newIncome.date}
                        onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="income-source" className="inline-flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                        Source
                      </Label>
                      <Select value={newIncome.source} onValueChange={(value) => setNewIncome({ ...newIncome, source: value })}>
                        <SelectTrigger id="income-source" className="h-11 w-full">
                          <SelectValue placeholder="Select income source" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeSources.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
              )}

              {incomeFormStep === 2 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Description and notes
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="income-description">Description</Label>
                      <Input
                        id="income-description"
                        placeholder="Enter income description"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-notes">Notes</Label>
                      <Input
                        id="income-notes"
                        placeholder="Additional notes"
                        value={newIncome.notes}
                        onChange={(e) => setNewIncome({ ...newIncome, notes: e.target.value })}
                        className="h-11"
                      />
                    </div>
                  </div>
                </section>
              )}

              {incomeFormStep === 3 && (
                <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 font-medium text-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Review income
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
                      <div className="text-muted-foreground">Category</div>
                      <div className="font-medium text-foreground">{newIncome.category_id ? getCategoryName(Number(newIncome.category_id)) : 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
                      <div className="text-muted-foreground">Amount</div>
                      <div className="font-medium text-foreground">{newIncome.amount ? formatCurrency(Number(newIncome.amount)) : formatCurrency(0)}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
                      <div className="text-muted-foreground">Date</div>
                      <div className="font-medium text-foreground">{new Date(newIncome.date).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
                      <div className="text-muted-foreground">Source</div>
                      <div className="font-medium text-foreground">{newIncome.source || 'Not selected'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2 md:col-span-2">
                      <div className="text-muted-foreground">Description</div>
                      <div className="font-medium text-foreground">{newIncome.description || 'Untitled'}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 px-3 py-2 md:col-span-3">
                      <div className="text-muted-foreground">Notes</div>
                      <div className="font-medium text-foreground">{newIncome.notes || 'No notes'}</div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <DialogFooter className="border-t border-border bg-card px-8 py-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              {incomeFormStep > 1 && (
                <Button type="button" variant="outline" onClick={() => setIncomeFormStep((step) => Math.max(1, step - 1))}>
                  Back
                </Button>
              )}
              {incomeFormStep < 3 ? (
                <PrimaryAction
                  type="button"
                  disabled={!canContinueIncomeForm}
                  onClick={() => setIncomeFormStep((step) => Math.min(3, step + 1))}
                >
                  Continue
                </PrimaryAction>
              ) : (
                <PrimaryAction type="submit">
                  {editingIncomeId ? 'Update Income' : 'Save Income'}
                </PrimaryAction>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedIncome)} onOpenChange={(open) => !open && setSelectedIncome(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Income Details</DialogTitle>
          </DialogHeader>
          {selectedIncome && (
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-foreground">{selectedIncome.description || 'Untitled'}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Category</span>
                <span>{getCategoryName(selectedIncome.category_id)}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selectedIncome.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Source</span>
                <span>{selectedIncome.source || 'No source'}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-green-600">{formatCurrency(Number(selectedIncome.amount))}</span>
              </div>
              <div>
                <div className="mb-1 text-muted-foreground">Notes</div>
                <div className="rounded-md bg-muted p-3">{selectedIncome.notes || 'No notes'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
