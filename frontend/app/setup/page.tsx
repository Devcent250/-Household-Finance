'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Plus, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiUrl } from '@/lib/api';

interface Household {
  id: number;
  name: string;
  owner_email: string;
  owner_name: string;
  member_count: number;
  created_at: string;
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Super Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Create households and assign administrators</p>
            </div>
            <Button variant="outline" onClick={() => router.push('/')}>
              Back to Main
            </Button>
          </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Create Household</CardTitle>
            <CardDescription>Create a new household and assign an admin user.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Household name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your household name" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Admin email</Label>
                  <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Your admin email" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Admin name</Label>
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Your admin name" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Admin password</Label>
                  <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Your password" className="h-11" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading} className="h-11">
                {loading ? 'Creating...' : 'Create Household'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>All Households</CardTitle>
            <CardDescription>{households.length} household(s) in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {households.map((hh) => (
                    <TableRow key={hh.id}>
                      <TableCell className="font-medium">{hh.name}</TableCell>
                      <TableCell>{hh.owner_name} ({hh.owner_email})</TableCell>
                      <TableCell>{hh.member_count}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(hh.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
