'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import type { Income, Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';

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
    setShowForm(false);
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

  if (loading) {
    return <div className="text-center py-8">Loading income...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Income Tracker</CardTitle>
            <Button
              onClick={() => {
                if (showForm) {
                  resetForm();
                  return;
                }
                setShowForm(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {editingIncomeId ? 'Editing Income' : 'Add Income'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSaveIncome} className="mb-4 rounded-lg border border-border bg-muted/60 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newIncome.category_id} onValueChange={(value) => setNewIncome({ ...newIncome, category_id: value })}>
                    <SelectTrigger id="category">
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
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={newIncome.amount}
                    onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newIncome.date}
                    onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={newIncome.source}
                    onValueChange={(value) => setNewIncome({ ...newIncome, source: value })}
                  >
                    <SelectTrigger id="source" className="w-full">
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
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter income description"
                    value={newIncome.description}
                    onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={newIncome.notes}
                    onChange={(e) => setNewIncome({ ...newIncome, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="border border-green-700 bg-green-600 font-semibold text-white shadow-sm hover:bg-green-700">
                  {editingIncomeId ? 'Update Income' : 'Save Income'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg font-semibold">
              <span>Total Income This Month</span>
              <span className="text-lg text-green-600">{formatCurrency(totalIncome)}</span>
            </div>

            {incomes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No income recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/70 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map((income) => (
                      <tr key={income.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(income.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{income.description || 'Untitled'}</td>
                        <td className="px-3 py-2">{getCategoryName(income.category_id)}</td>
                        <td className="px-3 py-2">{income.source || 'No source'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">{formatCurrency(Number(income.amount))}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button
                              className="rounded p-2 text-foreground hover:bg-muted"
                              onClick={() => setSelectedIncome(income)}
                              aria-label="View income details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded p-2 text-primary hover:bg-primary/10"
                              onClick={() => handleEditIncome(income)}
                              aria-label="Edit income"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded p-2 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteIncome(income.id)}
                              aria-label="Delete income"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
