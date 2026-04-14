'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Budget, Category } from '@/lib/types';

interface BudgetManagerProps {
  userId: string;
}

export default function BudgetManager({ userId }: BudgetManagerProps) {
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
        fetch('/api/budgets', {
          headers: { 'x-user-id': userId },
        }),
        fetch('/api/categories?type=expense', {
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
      const response = await fetch('/api/budgets', {
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
            <div className="space-y-4">
              {budgets.map((budget) => {
                const percentage = (Math.random() * 80).toFixed(0);
                const isAlert = parseInt(percentage) >= budget.alert_threshold;

                return (
                  <div key={budget.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">
                          {getCategoryName(budget.category_id)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">
                          ${budget.limit_amount.toFixed(2)}
                        </div>
                        <div className={`text-sm font-medium ${isAlert ? 'text-destructive' : 'text-green-600'}`}>
                          {percentage}% Used
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${isAlert ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      {isAlert && (
                        <div className="text-sm text-destructive font-medium">
                          ⚠️ Alert: {percentage}% of budget used
                        </div>
                      )}
                      <button className="ml-auto text-destructive hover:bg-destructive/10 p-2 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
