'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Pencil, Plus, Target, Trash2, PiggyBank } from 'lucide-react';
import type { FinancialGoal } from '@/lib/types';
import { apiFetch, apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { ActionIconButton, PrimaryAction, ProgressBar, WorkspaceCard } from './dashboard-ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';

interface FinancialGoalsProps {
  userId: string;
}

export default function FinancialGoals({ userId }: FinancialGoalsProps) {
  const { formatCurrency } = useCurrency();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savingGoal, setSavingGoal] = useState<FinancialGoal | null>(null);
  const [saveAmount, setSaveAmount] = useState('');
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: '',
    deadline: '',
    category: 'savings',
    priority: 'medium',
    current_amount: '',
  });

  const emptyGoalForm = {
    name: '',
    target_amount: '',
    deadline: '',
    category: 'savings',
    priority: 'medium',
    current_amount: '',
  };

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
      toast({ title: 'Missing fields', description: 'Please fill in required fields', variant: 'destructive' });
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
        setNewGoal(emptyGoalForm);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setNewGoal({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      deadline: goal.deadline ? goal.deadline.split('T')[0] : '',
      category: goal.category,
      priority: goal.priority,
      current_amount: (goal.current_amount || 0).toString(),
    });
    setShowForm(true);
  };

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal || !newGoal.name || !newGoal.target_amount) {
      toast({ title: 'Missing fields', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      const response = await apiFetch(`/api/goals/${editingGoal.id}`, userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGoal.name,
          target_amount: parseFloat(newGoal.target_amount),
          deadline: newGoal.deadline || null,
          category: newGoal.category,
          priority: newGoal.priority,
          current_amount: parseFloat(newGoal.current_amount || '0'),
          is_completed: editingGoal.is_completed,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals((current) => current.map((g) => (g.id === editingGoal.id ? data.data : g)));
        setEditingGoal(null);
        setNewGoal(emptyGoalForm);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleRecordSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savingGoal || !saveAmount) return;

    const added = parseFloat(saveAmount);
    if (isNaN(added) || added <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    const current = savingGoal.current_amount || 0;
    const remaining = savingGoal.target_amount - current;
    if (added > remaining) {
      setSaveAmount(remaining.toFixed(2));
      toast({ title: 'Amount adjusted', description: `Only $${remaining.toFixed(2)} remaining to reach the goal target. Amount adjusted to $${remaining.toFixed(2)}.` });
      return;
    }

    const newCurrent = current + added;
    try {
      const response = await apiFetch(`/api/goals/${savingGoal.id}`, userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_amount: newCurrent,
          is_completed: newCurrent >= savingGoal.target_amount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGoals((current) => current.map((g) => (g.id === savingGoal.id ? data.data : g)));
        setSaveAmount('');
        setSavingGoal(null);
        setShowSaveDialog(false);
      }
    } catch (error) {
      console.error('Error recording savings:', error);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      const response = await apiFetch(`/api/goals/${id}`, userId, { method: 'DELETE' });

      if (response.ok) {
        setGoals((current) => current.filter((goal) => goal.id !== id));
        toast({ title: 'Deleted', description: 'Goal deleted successfully' });
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
    <>
      <WorkspaceCard
        title="Goal Portfolio"
        description="Review savings, investment, debt, and household target progress."
        action={
          <PrimaryAction
            onClick={() => {
              setEditingGoal(null);
              setNewGoal(emptyGoalForm);
              setShowForm(true);
            }}
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Create
          </PrimaryAction>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-xs">#</TableHead>
                <TableHead className="text-xs">Goal</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Deadline</TableHead>
                <TableHead className="text-right text-xs">Current</TableHead>
                <TableHead className="text-right text-xs">Target</TableHead>
                <TableHead className="min-w-[180px] text-xs">Progress</TableHead>
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No financial goals set yet.
                  </TableCell>
                </TableRow>
              ) : goals.map((goal, index) => {
                const currentAmount = Number(goal.current_amount || 0);
                const targetAmount = Number(goal.target_amount || 0);
                const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
                const isCompleted = goal.is_completed || progress >= 100;

                return (
                  <TableRow key={goal.id}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      <span className="inline-flex items-center gap-2">
                        {isCompleted && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                        {goal.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{goal.category}</TableCell>
                    <TableCell className={`text-xs capitalize font-medium ${getPriorityColor(goal.priority)}`}>{goal.priority}</TableCell>
                    <TableCell className="text-xs">{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Not set'}</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(currentAmount)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{formatCurrency(targetAmount)}</TableCell>
                    <TableCell>
                      <div className="flex min-w-[160px] items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={progress} tone={isCompleted ? 'bg-primary' : 'bg-accent'} />
                        </div>
                        <span className="w-12 text-right text-xs font-medium">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {!isCompleted && (
                          <ActionIconButton
                            label="Mark goal complete"
                            tone="success"
                            onClick={() => handleCompleteGoal(goal)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </ActionIconButton>
                        )}
                        <ActionIconButton
                          label="Record savings"
                          onClick={() => { setSavingGoal(goal); setSaveAmount(''); setShowSaveDialog(true); }}
                        >
                          <PiggyBank className="h-3.5 w-3.5" />
                        </ActionIconButton>
                        <ActionIconButton
                          label="Edit goal"
                          tone="primary"
                          onClick={() => handleEditGoal(goal)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionIconButton>
                        <ActionIconButton
                          label="Delete goal"
                          tone="danger"
                          onClick={() => setDeleteConfirmId(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setEditingGoal(null); setNewGoal(emptyGoalForm); } setShowForm(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-2xl">
          <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal}>
            <div className="border-b border-border bg-card px-4 py-3">
              <DialogHeader>
                <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Goal entry
                </div>
                <DialogTitle className="text-lg">{editingGoal ? 'Edit goal' : 'Add goal'}</DialogTitle>
                <DialogDescription className="text-xs">Create a target and track progress toward the household goal.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-3 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-4 py-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="goal-name" className="text-xs">Goal Name</Label>
                <Input id="goal-name" placeholder="e.g., Emergency Fund" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-target" className="text-xs">Target Amount</Label>
                <Input id="goal-target" type="number" placeholder="0.00" value={newGoal.target_amount} onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })} step="0.01" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-current" className="text-xs">Current Amount</Label>
                <Input id="goal-current" type="number" placeholder="0.00" value={newGoal.current_amount} onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })} step="0.01" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-deadline" className="text-xs">Deadline</Label>
                <Input id="goal-deadline" type="date" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-category" className="text-xs">Category</Label>
                <Select value={newGoal.category} onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}>
                  <SelectTrigger id="goal-category" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="debt">Debt Payoff</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-priority" className="text-xs">Priority</Label>
                <Select value={newGoal.priority} onValueChange={(value) => setNewGoal({ ...newGoal, priority: value })}>
                  <SelectTrigger id="goal-priority" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-4 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditingGoal(null); setNewGoal(emptyGoalForm); setShowForm(false); }}>Cancel</Button>
              <PrimaryAction type="submit" size="sm">{editingGoal ? 'Update Goal' : 'Create Goal'}</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showSaveDialog} onOpenChange={(open) => { if (!open) { setSavingGoal(null); setSaveAmount(''); } setShowSaveDialog(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-sm">
          <form onSubmit={handleRecordSavings}>
            <div className="border-b border-border bg-card px-4 py-3">
              <DialogHeader>
                <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <PiggyBank className="h-3.5 w-3.5" />
                  Record savings
                </div>
                <DialogTitle className="text-lg">{savingGoal?.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Current: {formatCurrency(savingGoal?.current_amount || 0)} &middot; Target: {formatCurrency(savingGoal?.target_amount || 0)}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="px-4 py-3">
              <Label htmlFor="save-amount" className="text-xs">Amount to add</Label>
              <Input id="save-amount" type="number" placeholder="0.00" value={saveAmount} onChange={(e) => setSaveAmount(e.target.value)} step="0.01" className="mt-1.5 h-9 text-sm" autoFocus />
            </div>
            <DialogFooter className="border-t border-border bg-card px-4 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => { setSavingGoal(null); setSaveAmount(''); setShowSaveDialog(false); }}>Cancel</Button>
              <PrimaryAction type="submit" size="sm">Add Savings</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Delete goal"
        description="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirmId !== null) handleDeleteGoal(deleteConfirmId); setDeleteConfirmId(null); }}
      />
    </>
  );
}
