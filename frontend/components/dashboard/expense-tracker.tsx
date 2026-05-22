'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
import type { Expense, Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';

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

  const fetchData = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const [expensesRes, categoriesRes] = await Promise.all([
        fetch(apiUrl(`/api/expenses?month=${month}&year=${year}`), {
          headers: { 'x-user-id': userId },
        }),
        fetch(apiUrl('/api/categories?type=expense'), {
          headers: { 'x-user-id': userId },
        }),
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
    setShowForm(false);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.category_id || !newExpense.amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(apiUrl(editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses'), {
        method: editingExpenseId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
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
    setShowForm(true);
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const response = await fetch(apiUrl(`/api/expenses/${id}`), {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      });

      if (response.ok) {
        setExpenses((current) => current.filter((expense) => expense.id !== id));
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
  const getCategoryName = (id: number) => categories.find((category) => category.id === id)?.name || 'Uncategorized';

  if (loading) {
    return <div className="text-center py-8">Loading expenses...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense Tracker</CardTitle>
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
              {editingExpenseId ? 'Editing Expense' : 'Add Expense'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSaveExpense} className="mb-4 rounded-lg border border-border bg-muted/60 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newExpense.category_id} onValueChange={(value) => setNewExpense({ ...newExpense, category_id: value })}>
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
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="payment">Payment Method</Label>
                  <Select
                    value={newExpense.payment_method}
                    onValueChange={(value) => setNewExpense({ ...newExpense, payment_method: value })}
                  >
                    <SelectTrigger id="payment" className="w-full">
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
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter expense description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="border border-green-700 bg-green-600 font-semibold text-white shadow-sm hover:bg-green-700">
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg font-semibold">
              <span>Total Expenses This Month</span>
              <span className="text-lg text-destructive">{formatCurrency(totalExpenses)}</span>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No expenses recorded yet
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/70 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Category</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(expense.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{expense.description || 'Untitled'}</td>
                        <td className="px-3 py-2">{getCategoryName(expense.category_id)}</td>
                        <td className="px-3 py-2">{expense.payment_method || 'No payment method'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(Number(expense.amount))}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button
                              className="rounded p-2 text-foreground hover:bg-muted"
                              onClick={() => setSelectedExpense(expense)}
                              aria-label="View expense details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded p-2 text-primary hover:bg-primary/10"
                              onClick={() => handleEditExpense(expense)}
                              aria-label="Edit expense"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded p-2 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteExpense(expense.id)}
                              aria-label="Delete expense"
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
    </div>
  );
}
