import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const roles = [
  { name: 'Owner', permissions: 'Full access to all features' },
  { name: 'Member', permissions: 'Add expenses and view reports' },
  { name: 'Viewer', permissions: 'Read-only access to dashboards' },
];

export default function RolesPanel() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Define access levels so each household member sees only what they need.
        </p>
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.name} className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="font-medium text-foreground">{role.name}</div>
              <div className="text-sm text-muted-foreground">{role.permissions}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
