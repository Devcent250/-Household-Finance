'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { apiFetch, apiUrl } from '@/lib/api';
import { ActionIconButton, PrimaryAction, WorkspaceCard } from './dashboard-ui';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/hooks/use-toast';

interface CategoriesPanelProps {
  userId: string;
}

export default function CategoriesPanel({ userId }: CategoriesPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#10b981');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [userId]);

  const fetchCategories = async () => {
    const response = await apiFetch('/api/categories', userId);
    const data = await response.json();
    setCategories(data.data || []);
  };

  const handleAddCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Missing name', description: 'Please enter a category name', variant: 'destructive' });
      return;
    }

    const response = await apiFetch('/api/categories', userId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, color }),
    });

    if (response.ok) {
      const data = await response.json();
      setCategories((current) => [...current, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setShowForm(false);
      toast({ title: 'Created', description: 'Category added successfully' });
    } else {
      const err = await response.json();
      toast({ title: 'Error', description: err.error || 'Failed to create category', variant: 'destructive' });
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setColor(category.color);
    setShowForm(true);
  };

  const handleUpdateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCategory || !name.trim()) {
      toast({ title: 'Missing name', description: 'Please enter a category name', variant: 'destructive' });
      return;
    }

    const response = await apiFetch(`/api/categories/${editingCategory.id}`, userId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), type, color }),
    });

    if (response.ok) {
      const data = await response.json();
      setCategories((current) => current.map((c) => (c.id === editingCategory.id ? data.data : c)));
      setEditingCategory(null);
      setName('');
      setShowForm(false);
      toast({ title: 'Updated', description: 'Category updated successfully' });
    } else {
      const err = await response.json();
      toast({ title: 'Error', description: err.error || 'Failed to update category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const response = await apiFetch(`/api/categories/${id}`, userId, { method: 'DELETE' });

    if (response.ok) {
      setCategories((current) => current.filter((category) => category.id !== id));
      toast({ title: 'Deleted', description: 'Category deleted successfully' });
    } else {
      const err = await response.json();
      toast({ title: 'Error', description: err.error || 'Failed to delete category', variant: 'destructive' });
    }
  };

  return (
    <>
      <WorkspaceCard
        title="Category Library"
        description="Add, color-code, and remove categories used across the finance workspace."
        action={
          <PrimaryAction onClick={() => { setEditingCategory(null); setName(''); setType('expense'); setColor('#10b981'); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4" />
            Create
          </PrimaryAction>
        }
      >
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[580px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-xs">#</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Color</TableHead>
                <TableHead className="w-16 text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{category.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border text-xs capitalize">
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: category.color }} />
                      {category.color}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ActionIconButton
                        label="Edit category"
                        tone="primary"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </ActionIconButton>
                      <ActionIconButton
                        label="Delete category"
                        tone="danger"
                        onClick={() => setDeleteConfirmId(category.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </ActionIconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setEditingCategory(null); setName(''); setType('expense'); setColor('#10b981'); } setShowForm(open); }}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-lg">
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}>
            <div className="border-b border-border bg-card px-4 py-3">
              <DialogHeader>
                <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Tags className="h-3.5 w-3.5" />
                  Category entry
                </div>
                <DialogTitle className="text-lg">{editingCategory ? 'Edit category' : 'Add category'}</DialogTitle>
                <DialogDescription className="text-xs">Create a reusable category for transactions, budgets, and reports.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-3 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-4 py-3 md:grid-cols-[1fr_140px_100px]">
              <div className="space-y-1.5">
                <Label htmlFor="category-name" className="text-xs">Name</Label>
                <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Groceries" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={(value) => setType(value as 'expense' | 'income')}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category-color" className="text-xs">Color</Label>
                <Input id="category-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-9" />
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-4 py-3">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditingCategory(null); setName(''); setType('expense'); setColor('#10b981'); setShowForm(false); }}>Cancel</Button>
              <PrimaryAction type="submit" size="sm">{editingCategory ? 'Update Category' : 'Add Category'}</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Delete category"
        description="Are you sure you want to delete this category? Categories with existing transactions cannot be deleted."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirmId !== null) handleDeleteCategory(deleteConfirmId); setDeleteConfirmId(null); }}
      />
    </>
  );
}
