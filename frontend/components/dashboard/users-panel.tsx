'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { apiFetch, apiUrl } from '@/lib/api';
import { ActionIconButton, FeatureShell, PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface UsersPanelProps {
  userId: string;
}

interface Member {
  id: number;
  user_id: number;
  role_id: number | null;
  email: string;
  full_name: string;
  role_name: string | null;
  joined_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Household {
  id: number;
  name: string;
}

const hhHeaders = (userId: string) => ({
  'x-user-id': userId,
  'x-household-id': localStorage.getItem('householdId') || '',
});

export default function UsersPanel({ userId }: UsersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [error, setError] = useState('');
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoleId, setEditRoleId] = useState('');

  useEffect(() => {
    fetchMembers();
    fetchRoles();
    apiFetch('/api/households', userId).then((r) => r.json()).then((d) => {
      if (d.data && d.data.length > 0) setHousehold(d.data[0]);
    }).catch(() => {});
  }, [userId]);

  const fetchMembers = async () => {
    const response = await fetch(apiUrl('/api/households/members'), { headers: hhHeaders(userId) });
    const data = await response.json();
    setMembers(data.data || []);
  };

  const fetchRoles = async () => {
    const response = await fetch(apiUrl('/api/households/roles'), { headers: hhHeaders(userId) });
    const data = await response.json();
    setRoles(data.data || []);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }

    const response = await fetch(apiUrl('/api/households/members'), {
      method: 'POST',
      headers: { ...hhHeaders(userId), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name.trim(),
        email: email.trim(),
        password,
        role_id: roleId ? Number(roleId) : undefined,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setShowForm(false);
      setName('');
      setEmail('');
      setPassword('');
      setRoleId('');
      fetchMembers();
    } else {
      setError(data.error || 'Failed to add member');
    }
  };

  const handleEditMember = (member: Member) => {
    setEditMember(member);
    setEditName(member.full_name || '');
    setEditEmail(member.email || '');
    setEditRoleId(member.role_id ? String(member.role_id) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;

    const body: Record<string, string> = {};
    if (editName !== editMember.full_name) body.full_name = editName.trim();
    if (editEmail !== editMember.email) body.email = editEmail.trim();
    if (editRoleId !== String(editMember.role_id)) body.role_id = editRoleId;

    if (Object.keys(body).length === 0) { setEditMember(null); return; }

    const response = await fetch(apiUrl(`/api/households/members/${editMember.id}`), {
      method: 'PATCH',
      headers: { ...hhHeaders(userId), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setEditMember(null);
      fetchMembers();
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    const response = await fetch(apiUrl(`/api/households/members/${memberId}`), {
      method: 'DELETE',
      headers: hhHeaders(userId),
    });
    if (response.ok) fetchMembers();
  };

  const handleRoleChange = async (memberId: number, newRoleId: string) => {
    await fetch(apiUrl(`/api/households/members/${memberId}`), {
      method: 'PATCH',
      headers: { ...hhHeaders(userId), 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: Number(newRoleId) }),
    });
    fetchMembers();
  };

  return (
      <FeatureShell
        title={household ? `${household.name} — Members` : 'Members'}
        description="Manage household members and assign roles."
        eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Building2 className="h-4 w-4" /> {household?.name || 'Household'}</span>}
      actions={
        <PrimaryAction onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4" />
          Add Member
        </PrimaryAction>
      }
    >
      <WorkspaceCard title="Household Members" description="Users connected to this household.">
        <div className="overflow-hidden rounded-xl border border-border">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Household</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No members yet.
                  </TableCell>
                </TableRow>
              ) : members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-foreground">{member.full_name || 'Unnamed'}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role_id ? String(member.role_id) : ''}
                      onValueChange={(val) => handleRoleChange(member.id, val)}
                    >
                      <SelectTrigger className="h-9 w-[160px] border-border bg-background">
                        <SelectValue placeholder="No role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.filter((r) => r.name !== 'Superadmin').map((role) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{household?.name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ActionIconButton label="Edit member" onClick={() => handleEditMember(member)}>
                        <Pencil className="h-4 w-4" />
                      </ActionIconButton>
                      {member.user_id !== Number(userId) && (
                        <ActionIconButton label="Remove member" tone="danger" onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </ActionIconButton>
                      )}
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
          <form onSubmit={handleAddMember}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <Users className="h-4 w-4" />
                  New member
                </div>
                <DialogTitle className="text-2xl">Add household member</DialogTitle>
                <DialogDescription>Create a new user account and add them to this household.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="mem-name">Full name</Label>
                <Input id="mem-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mem-email">Email</Label>
                <Input id="mem-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mem-password">Password</Label>
                <Input id="mem-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mem-role">Role</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => r.name !== 'Superadmin').map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(''); }}>Cancel</Button>
              <PrimaryAction type="submit">Add Member</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMember} onOpenChange={(open) => { if (!open) setEditMember(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border p-0 sm:max-w-2xl">
          <form onSubmit={handleSaveEdit}>
            <div className="border-b border-border bg-card px-6 py-5">
              <DialogHeader>
                <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                  <Pencil className="h-4 w-4" />
                  Edit member
                </div>
                <DialogTitle className="text-2xl">Edit household member</DialogTitle>
                <DialogDescription>Update member details and role assignment.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="grid gap-4 bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Jane Doe" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="jane@example.com" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editRoleId} onValueChange={setEditRoleId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter((r) => r.name !== 'Superadmin').map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-card px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
              <PrimaryAction type="submit">Save Changes</PrimaryAction>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FeatureShell>
  );
}
