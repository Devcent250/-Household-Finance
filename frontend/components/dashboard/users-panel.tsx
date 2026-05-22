'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiUrl } from '@/lib/api';

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
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-3">
          <div>
            <div className="font-medium text-foreground">{profile?.full_name || 'Current User'}</div>
            <div className="text-sm text-muted-foreground">{profile?.email || localStorage.getItem('userEmail')}</div>
          </div>
          <Badge variant="outline" className="border-border">
            Owner
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
