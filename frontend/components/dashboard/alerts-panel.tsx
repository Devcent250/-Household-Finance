'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';

interface AlertsPanelProps {
  userId: string;
}

interface BudgetAlert {
  id: number;
  category_name: string;
  limit_amount: string;
  alert_threshold: string;
  spent_amount: string;
}

export default function AlertsPanel({ userId }: AlertsPanelProps) {
  const { formatCurrency } = useCurrency();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);

  useEffect(() => {
    fetch(apiUrl('/api/alerts'), {
      headers: { 'x-user-id': userId },
    })
      .then((response) => response.json())
      .then((data) => setAlerts(data.data || []))
      .catch((error) => console.error('Error fetching alerts:', error));
  }, [userId]);

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
            No active budget alerts.
          </div>
        ) : (
          alerts.map((alert) => {
            const spent = Number(alert.spent_amount || 0);
            const limit = Number(alert.limit_amount || 0);
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            return (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <div className="font-medium text-foreground">{alert.category_name} budget threshold reached</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(spent)} of {formatCurrency(limit)} spent ({Math.round(percentage)}%).
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
