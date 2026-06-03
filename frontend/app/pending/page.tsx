'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function PendingPage() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Clock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Account Created</CardTitle>
          <CardDescription className="text-sm leading-6">
            Your account is ready. A household administrator will assign you to a household before you can access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
