'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Home, ArrowRight, ShieldCheck, Users, Pencil, Trash2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Household {
  id: number;
  name: string;
  currency: string;
  owner_email: string;
  owner_name: string;
  member_count: number;
  created_at: string;
}

interface Member {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  role_name: string | null;
  joined_at: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailHh, setDetailHh] = useState<Household | null>(null);
  const [detailMembers, setDetailMembers] = useState<Member[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editHh, setEditHh] = useState<Household | null>(null);
  const [editName, setEditName] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (!userId) { router.push('/'); return; }
    fetchHouseholds();
  }, []);

  const fetchHouseholds = async () => {
    const res = await fetch(apiUrl('/api/admin/households'), {
      headers: { 'x-user-id': userId || '' },
    });
    if (!res.ok) { router.push('/dashboard'); return; }
    const data = await res.json();
    setHouseholds(data.data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch(apiUrl('/api/admin/households'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
      body: JSON.stringify({
        name: name.trim(),
        admin_email: adminEmail.trim(),
        admin_name: adminName.trim() || 'Household Admin',
        admin_password: adminPassword,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setName('');
      setAdminEmail('');
      setAdminName('');
      setAdminPassword('');
      fetchHouseholds();
    } else {
      setError(data.error || 'Failed to create household');
    }
    setLoading(false);
  };

  const handleViewDetails = async (hh: Household) => {
    setDetailHh(hh);
    setDetailMembers([]);
    setDetailLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/households/${hh.id}/members`), {
        headers: { 'x-user-id': userId || '' },
      });
      const data = await res.json();
      setDetailMembers(data.data || []);
    } catch {
      setDetailMembers([]);
    }
    setDetailLoading(false);
  };

  const openEdit = (hh: Household) => {
    setEditHh(hh);
    setEditName(hh.name);
    setEditCurrency('USD');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHh) return;
    setEditLoading(true);

    const res = await fetch(apiUrl(`/api/admin/households/${editHh.id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
      body: JSON.stringify({ name: editName.trim(), currency: editCurrency }),
    });

    if (res.ok) {
      setEditHh(null);
      fetchHouseholds();
    }
    setEditLoading(false);
  };

  const handleDelete = async (hh: Household) => {
    if (!confirm(`Delete "${hh.name}"? This cannot be undone.`)) return;

    await fetch(apiUrl(`/api/admin/households/${hh.id}`), {
      method: 'DELETE',
      headers: { 'x-user-id': userId || '' },
    });
    fetchHouseholds();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Super Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Create households and assign administrators</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/')} className="h-8 text-xs">
            <Home className="h-3.5 w-3.5 mr-1" />
            Main
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">Create Household</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Household name</Label>
                  <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your household name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Admin email</Label>
                  <Input className="h-8 text-xs" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Your admin email" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Admin name</Label>
                  <Input className="h-8 text-xs" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Your admin name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Admin password</Label>
                  <Input className="h-8 text-xs" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Your password" />
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" size="sm" disabled={loading} className="h-8 text-xs">
                {loading ? 'Creating...' : 'Create Household'}
                {!loading && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm">All Households</CardTitle>
            <div className="text-[11px] text-muted-foreground">{households.length} household(s) in the system.</div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Admin</TableHead>
                    <TableHead className="text-xs">Members</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {households.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-16 text-center text-xs text-muted-foreground">No households yet.</TableCell>
                    </TableRow>
                  ) : households.map((hh) => (
                    <TableRow key={hh.id}>
                      <TableCell className="text-xs font-medium">{hh.name}</TableCell>
                      <TableCell className="text-xs">{hh.owner_name} ({hh.owner_email})</TableCell>
                      <TableCell className="text-xs">{hh.member_count}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(hh.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(hh)} className="h-7 text-xs gap-1">
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(hh)} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(hh)} className="h-7 text-xs gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detailHh} onOpenChange={(open) => { if (!open) setDetailHh(null); }}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              {detailHh?.name} — Members
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
          ) : detailMembers.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No members found.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-medium">{m.full_name || 'Unnamed'}</TableCell>
                      <TableCell className="text-xs">{m.email}</TableCell>
                      <TableCell className="text-xs capitalize">{m.role_name || 'No role'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(m.joined_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editHh} onOpenChange={(open) => { if (!open) setEditHh(null); }}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Household
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Household name</Label>
              <Input className="h-8 text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Currency</Label>
              <Input className="h-8 text-xs" value={editCurrency} onChange={(e) => setEditCurrency(e.target.value)} placeholder="USD" />
            </div>
            <Button type="submit" size="sm" disabled={editLoading} className="h-8 text-xs">
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
