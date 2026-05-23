'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { FeatureShell, WorkspaceCard } from './dashboard-ui';

interface UsersPanelProps {
  userId: string;
}

interface Profile {
  email: string;
  full_name: string;
}

export default function UsersPanel({ userId }: UsersPanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/profile'), {
      headers: { 'x-user-id': userId },
    })
      .then((response) => response.json())
      .then((data) => setProfile(data.data || null))
      .catch((error) => console.error('Error fetching user:', error));
  }, [userId]);

  return (
    <FeatureShell
      title="Users"
      description="Manage household users and review the current workspace owner."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Users className="h-4 w-4" /> User access</span>}
    >
      <WorkspaceCard title="Workspace Members" description="Current users connected to this household finance workspace.">
        <div className="flex items-center justify-between rounded-xl border border-border bg-background/70 px-4 py-4 shadow-sm">
          <div>
            <div className="font-medium text-foreground">{profile?.full_name || 'Current User'}</div>
            <div className="text-sm text-muted-foreground">{profile?.email || localStorage.getItem('userEmail')}</div>
          </div>
          <Badge variant="outline" className="border-border">
            Owner
          </Badge>
        </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
