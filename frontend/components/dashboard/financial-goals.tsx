'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, CheckCircle, Target } from 'lucide-react';
import type { FinancialGoal } from '@/lib/types';
import { apiFetch, apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { ActionIconButton, FeatureShell, PrimaryAction, ProgressBar, WorkspaceCard } from './dashboard-ui';

interface FinancialGoalsProps {
  userId: string;
}

export default function FinancialGoals({ userId }: FinancialGoalsProps) {
  const { formatCurrency } = useCurrency();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    deadline: '',
    category: 'savings',
    priority: 'medium',
    current_amount: '',
  });

  useEffect(() => {
    fetchGoals();
  }, [userId]);

  const fetchGoals = async () => {
    try {
      const response = await apiFetch('/api/goals', userId);
      const data = await response.json();
      setGoals(data.data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.target_amount) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await apiFetch('/api/goals', userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          target_amount: parseFloat(newGoal.target_amount),
          current_amount: parseFloat(newGoal.current_amount || '0'),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals([data.data, ...goals]);
        setNewGoal({
          name: '',
          target_amount: '',
          deadline: '',
          category: 'savings',
          priority: 'medium',
          current_amount: '',
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      const response = await apiFetch(`/api/goals/${id}`, userId, { method: 'DELETE' });

      if (response.ok) {
        setGoals((current) => current.filter((goal) => goal.id !== id));
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const handleCompleteGoal = async (goal: FinancialGoal) => {
    try {
      const response = await apiFetch(`/api/goals/${goal.id}`, userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_amount: goal.target_amount,
          is_completed: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals((current) => current.map((item) => (item.id === goal.id ? data.data : item)));
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-accent';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading goals...</div>;
  }

  return (
    <FeatureShell
      title="Financial Goals"
      description="Plan household targets, track funding progress, and mark goals complete when targets are reached."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Target className="h-4 w-4" /> Goals workspace</span>}
      actions={
        <PrimaryAction onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add Goal
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Goal Portfolio" description="Review savings, investment, debt, and household target progress.">
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="min-w-[180px]">Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No financial goals set yet.
                  </TableCell>
                </TableRow>
              ) : goals.map((goal) => {
                const currentAmount = Number(goal.current_amount || 0);
                const targetAmount = Number(goal.target_amount || 0);
                const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                const isCompleted = goal.is_completed || progress >= 100;

                return (
                  <TableRow key={goal.id}>
                    <TableCell className="font-semibold text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {isCompleted && <CheckCircle className="h-4 w-4 text-primary" />}
                        {goal.name}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{goal.category}</TableCell>
                    <TableCell className={`capitalize font-medium ${getPriorityColor(goal.priority)}`}>{goal.priority}</TableCell>
                    <TableCell>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Not set'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(currentAmount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(targetAmount)}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[160px] items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={progress} tone={isCompleted ? 'bg-primary' : 'bg-accent'} />
                        </div>
                        <span className="w-12 text-right font-medium">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!isCompleted && (
                          <ActionIconButton
                            label="Mark goal complete"
                            tone="success"
                            onClick={() => handleCompleteGoal(goal)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </ActionIconButton>
                        )}
                        <ActionIconButton
                          label="Delete goal"
                          tone="danger"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </ActionIconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-3xl">
          <form onSubmit={handleAddGoal}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <Target className="h-4 w-4" />
                  Goal entry
                </div>
                <DialogTitle className="text-2xl">Add goal</DialogTitle>
                <DialogDescription>Create a target and track progress toward the household goal.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input id="goal-name" placeholder="e.g., Emergency Fund" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target Amount</Label>
                <Input id="goal-target" type="number" placeholder="0.00" value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} step="0.01" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-current">Current Amount</Label>
                <Input id="goal-current" type="number" placeholder="0.00" value={newGoal.current_amount} onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })} step="0.01" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-deadline">Deadline</Label>
                <Input id="goal-deadline" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-category">Category</Label>
                <Select value={newGoal.category} onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}>
                  <SelectTrigger id="goal-category" className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="debt">Debt Payoff</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-priority">Priority</Label>
                <Select value={newGoal.priority} onValueChange={(value) => setNewGoal({ ...newGoal, priority: value })}>
                  <SelectTrigger id="goal-priority" className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <PrimaryAction type="submit">Create Goal</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
