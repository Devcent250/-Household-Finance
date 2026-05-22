'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { Category } from '@/lib/types';
import { apiUrl } from '@/lib/api';

interface CategoriesPanelProps {
  userId: string;
}

export default function CategoriesPanel({ userId }: CategoriesPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#10b981');

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
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleAddCategory} className="grid gap-3 md:grid-cols-[1fr_160px_96px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Groceries" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'expense' | 'income')}>
              <SelectTrigger>
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
            <Input id="category-color" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
                <div>
                  <div className="font-medium text-foreground">{category.name}</div>
                  <Badge variant="outline" className="mt-1 border-border capitalize">
                    {category.type}
                  </Badge>
                </div>
              </div>
              <button
                className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors"
                onClick={() => handleDeleteCategory(category.id)}
                aria-label="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
