'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import type { Budget, Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';

interface BudgetManagerProps {
  userId: string;
}

export default function BudgetManager({ userId }: BudgetManagerProps) {
  const { formatCurrency } = useCurrency();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category_id: '',
    limit_amount: '',
    period: 'monthly',
    alert_threshold: '80',
    period_start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [userId]);

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
        setNewBudget({
          category_id: '',
          limit_amount: '',
          period: 'monthly',
          alert_threshold: '80',
          period_start_date: new Date().toISOString().split('T')[0],
        });
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

  if (loading) {
    return <div className="text-center py-8">Loading budgets...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget Manager</CardTitle>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleAddBudget} className="mb-6 p-4 bg-muted rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newBudget.category_id} onValueChange={(value) => setNewBudget({ ...newBudget, category_id: value })}>
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
                  <Label htmlFor="limit">Budget Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    placeholder="0.00"
                    value={newBudget.limit_amount}
                    onChange={(e) => setNewBudget({ ...newBudget, limit_amount: e.target.value })}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Select value={newBudget.period} onValueChange={(value) => setNewBudget({ ...newBudget, period: value })}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="threshold">Alert Threshold (%)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    placeholder="80"
                    value={newBudget.alert_threshold}
                    onChange={(e) => setNewBudget({ ...newBudget, alert_threshold: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary text-primary-foreground">
                  Create Budget
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {budgets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budgets created yet
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader className="bg-muted/40">
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
                  {budgets.map((budget) => {
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
                            <div className="h-2 flex-1 rounded-full bg-muted">
                              <div
                                className={`h-2 rounded-full transition-all ${isAlert ? 'bg-destructive' : 'bg-primary'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className={`w-16 text-right font-medium ${isAlert ? 'text-destructive' : 'text-green-600'}`}>
                              {Math.round(percentage)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <button
                            className="rounded p-2 text-destructive transition-colors hover:bg-destructive/10"
                            onClick={() => handleDeleteBudget(budget.id)}
                            aria-label="Delete budget"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
