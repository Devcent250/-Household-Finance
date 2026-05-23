'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { EmptyState, FeatureShell, ProgressBar, WorkspaceCard } from './dashboard-ui';

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
    <FeatureShell
      title="Alerts"
      description="Review active budget threshold warnings and spending risk signals."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Bell className="h-4 w-4" /> Risk monitor</span>}
    >
      <WorkspaceCard title="Budget Alerts" description="Categories appear here when spending crosses configured thresholds.">
        {alerts.length === 0 ? (
          <EmptyState title="No active budget alerts" description="Your configured budget thresholds are currently clear." />
        ) : (
          alerts.map((alert) => {
            const spent = Number(alert.spent_amount || 0);
            const limit = Number(alert.limit_amount || 0);
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            return (
              <div key={alert.id} className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="font-medium text-foreground">{alert.category_name} budget threshold reached</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(spent)} of {formatCurrency(limit)} spent ({Math.round(percentage)}%).
                  </div>
                  <ProgressBar value={percentage} tone="bg-destructive" />
                </div>
              </div>
            );
          })
        )}
      </WorkspaceCard>
    </FeatureShell>
  );
}
