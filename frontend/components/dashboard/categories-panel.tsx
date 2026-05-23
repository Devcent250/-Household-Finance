'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Tags, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';
import { ActionIconButton, FeatureShell, PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface CategoriesPanelProps {
  userId: string;
}

export default function CategoriesPanel({ userId }: CategoriesPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#10b981');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const fetchCategories = async () => {
    const response = await fetch(apiUrl('/api/categories'), {
      headers: { 'x-user-id': userId },
    });
    const data = await response.json();
    setCategories(data.data || []);
  };

  const handleAddCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    const response = await fetch(apiUrl('/api/categories'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ name: name.trim(), type, color }),
    });

    if (response.ok) {
      const data = await response.json();
      setCategories((current) => [...current, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setShowForm(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const response = await fetch(apiUrl(`/api/categories/${id}`), {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });

    if (response.ok) {
      setCategories((current) => current.filter((category) => category.id !== id));
    }
  };

  return (
    <FeatureShell
      title="Categories"
      description="Maintain reusable income and expense categories for cleaner reports, budgets, and activity tracking."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Tags className="h-4 w-4" /> Category library</span>}
      actions={
        <PrimaryAction onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add Category
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Category Library" description="Add, color-code, and remove categories used across the finance workspace.">
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium text-foreground">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border capitalize">
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: category.color }} />
                      {category.color}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionIconButton
                      label="Delete category"
                      tone="danger"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </ActionIconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-2xl">
          <form onSubmit={handleAddCategory}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <Tags className="h-4 w-4" />
                  Category entry
                </div>
                <DialogTitle className="text-2xl">Add category</DialogTitle>
                <DialogDescription>Create a reusable category for transactions, budgets, and reports.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5 md:grid-cols-[1fr_180px_120px]">
              <div className="space-y-2">
                <Label htmlFor="category-name">Name</Label>
                <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Groceries" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as 'expense' | 'income')}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <Input id="category-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11" />
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <PrimaryAction type="submit">Add Category</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
