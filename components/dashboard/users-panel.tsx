import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const users = [
  { name: 'Admin', email: 'admin@demo.local', role: 'Owner' },
  { name: 'Aline', email: 'aline@demo.local', role: 'Member' },
  { name: 'Jean', email: 'jean@demo.local', role: 'Viewer' },
];

export default function UsersPanel() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Manage household members who can access income, expenses, and budgets.
        </p>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.email} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div>
                <div className="font-medium text-foreground">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              <Badge variant="outline" className="border-border">
                {user.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
