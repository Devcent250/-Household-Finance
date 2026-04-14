'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import type { Income, Category } from '@/lib/types';

interface IncomeTrackerProps {
  userId: string;
}

export default function IncomeTracker({ userId }: IncomeTrackerProps) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newIncome, setNewIncome] = useState({
    category_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    source: '',
    notes: '',
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
        fetch(`/api/income?month=${month}&year=${year}`, {
          headers: { 'x-user-id': userId },
        }),
        fetch('/api/categories?type=income', {
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

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncome.category_id || !newIncome.amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(newIncome),
      });

      if (response.ok) {
        const data = await response.json();
        setIncomes([data.data, ...incomes]);
        setNewIncome({
          category_id: '',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          source: '',
          notes: '',
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  const totalIncome = incomes.reduce((sum, inc) => sum + parseFloat(inc.amount.toString()), 0);

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
              onClick={() => setShowForm(!showForm)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Income
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleAddIncome} className="mb-6 p-4 bg-muted rounded-lg space-y-4">
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
                  <Input
                    id="source"
                    placeholder="Salary, Freelance, etc."
                    value={newIncome.source}
                    onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
                  />
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
                <Button type="submit" className="bg-primary text-primary-foreground">
                  Save Income
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg font-semibold">
              <span>Total Income This Month</span>
              <span className="text-lg text-green-600">${totalIncome.toFixed(2)}</span>
            </div>

            {incomes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No income recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {incomes.map((income) => (
                  <div key={income.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{income.description || 'Untitled'}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(income.date).toLocaleDateString()} • {income.source}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">${parseFloat(income.amount.toString()).toFixed(2)}</div>
                    </div>
                    <button className="ml-4 text-destructive hover:bg-destructive/10 p-2 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
