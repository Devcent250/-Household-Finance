'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Plus, Trash2, Pencil, Shield } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { ActionIconButton, FeatureShell, PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface RolesPanelProps {
  userId: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
}

const ALL_PERMISSIONS = [
  'dashboard:view',
  'expenses:create', 'expenses:view', 'expenses:edit', 'expenses:delete',
  'income:create', 'income:view', 'income:edit', 'income:delete',
  'budgets:create', 'budgets:view', 'budgets:edit', 'budgets:delete',
  'goals:create', 'goals:view', 'goals:edit', 'goals:delete',
  'categories:manage', 'reports:view', 'analytics:view',
  'members:manage', 'roles:manage', 'settings:manage',
];

const PERMISSION_LABELS: Record<string, string> = {
  'dashboard:view': 'View Dashboard',
  'expenses:create': 'Create expenses',
  'expenses:view': 'View expenses',
  'expenses:edit': 'Edit expenses',
  'expenses:delete': 'Delete expenses',
  'income:create': 'Create income',
  'income:view': 'View income',
  'income:edit': 'Edit income',
  'income:delete': 'Delete income',
  'budgets:create': 'Create budgets',
  'budgets:view': 'View budgets',
  'budgets:edit': 'Edit budgets',
  'budgets:delete': 'Delete budgets',
  'goals:create': 'Create goals',
  'goals:view': 'View goals',
  'goals:edit': 'Edit goals',
  'goals:delete': 'Delete goals',
  'categories:manage': 'Manage categories',
  'reports:view': 'View reports',
  'analytics:view': 'View analytics',
  'members:manage': 'Manage members',
  'roles:manage': 'Manage roles',
  'settings:manage': 'Manage settings',
};

export default function RolesPanel({ userId }: RolesPanelProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRoles();
  }, [userId]);

  const fetchRoles = async () => {
    const response = await fetch(apiUrl('/api/households/roles'), {
      headers: { 'x-user-id': userId, 'x-household-id': localStorage.getItem('householdId') || '' },
    });
    const data = await response.json();
    setRoles(data.data || []);
  };

  const openCreate = () => {
    setEditingRole(null);
    setName('');
    setDescription('');
    setSelectedPerms(new Set());
    setShowForm(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setSelectedPerms(new Set(role.permissions || []));
    setShowForm(true);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { 'Content-Type': 'application/json', 'x-user-id': userId, 'x-household-id': localStorage.getItem('householdId') || '' };
    const body = JSON.stringify({
      name: name.trim(),
      description: description.trim(),
      permissions: Array.from(selectedPerms),
    });

    const url = editingRole
      ? apiUrl(`/api/households/roles/${editingRole.id}`)
      : apiUrl('/api/households/roles');
    const method = editingRole ? 'PATCH' : 'POST';

    const response = await fetch(url, { method, headers, body });
    if (response.ok) {
      setShowForm(false);
      fetchRoles();
    }
  };

  const handleDelete = async (roleId: number) => {
    const response = await fetch(apiUrl(`/api/households/roles/${roleId}`), {
      method: 'DELETE',
      headers: { 'x-user-id': userId, 'x-household-id': localStorage.getItem('householdId') || '' },
    });
    if (response.ok) fetchRoles();
  };

  return (
    <FeatureShell
      title="Roles"
      description="Define custom roles with granular permissions for household members."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Shield className="h-4 w-4" /> Access control</span>}
      actions={
        <PrimaryAction onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Create Role
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Custom Roles" description="Create roles and assign specific permissions to each.">
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No roles yet.
                  </TableCell>
                </TableRow>
              ) : roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium text-foreground">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(role.permissions || []).slice(0, 4).map((p) => (
                        <Badge key={p} variant="outline" className="border-border text-xs">
                          {PERMISSION_LABELS[p] || p}
                        </Badge>
                      ))}
                      {(role.permissions || []).length > 4 && (
                        <Badge variant="outline" className="border-border text-xs">
                          +{role.permissions.length - 4}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <ActionIconButton label="Edit role" onClick={() => openEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton label="Delete role" tone="danger" onClick={() => handleDelete(role.id)}>
                        <Trash2 className="h-4 w-4" />
                      </ActionIconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </WorkspaceCard>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  {editingRole ? 'Edit role' : 'New role'}
                </div>
                <DialogTitle className="text-2xl">{editingRole ? 'Edit role' : 'Create role'}</DialogTitle>
                <DialogDescription>Define the role name and select permissions.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role name</Label>
                  <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Manager" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-desc">Description</Label>
                  <Input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Can manage budgets and reports" className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/70 p-4 sm:grid-cols-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedPerms.has(perm)} onCheckedChange={() => togglePerm(perm)} />
                      {PERMISSION_LABELS[perm]}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <PrimaryAction type="submit">{editingRole ? 'Save' : 'Create Role'}</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
