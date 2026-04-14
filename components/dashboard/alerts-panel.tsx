import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const alerts = [
  'Budget usage reaches 80%',
  'Monthly limit exceeded',
  'Large expense detected',
];

export default function AlertsPanel() {
  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Budget alerts help households react early when spending begins to exceed planned limits.
        </p>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert} className="rounded-lg border border-border bg-destructive/5 px-3 py-2 text-sm text-foreground">
              {alert}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
