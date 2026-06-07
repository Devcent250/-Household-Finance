'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bell } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import { EmptyState, ProgressBar, WorkspaceCard } from './dashboard-ui';

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
    apiFetch('/api/alerts', userId)
      .then((response) => response.json())
      .then((data) => setAlerts(data.data || []))
      .catch((error) => console.error('Error fetching alerts:', error));
  }, [userId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Alerts</h2>
      </div>
      <WorkspaceCard title="Budget Alerts" description="Categories appear here when spending crosses configured thresholds.">
        {alerts.length === 0 ? (
          <EmptyState title="No active budget alerts" description="Your configured budget thresholds are currently clear." />
        ) : (
          alerts.map((alert) => {
            const spent = Number(alert.spent_amount || 0);
            const limit = Number(alert.limit_amount || 0);
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;

            return (
              <div key={alert.id} className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs font-medium text-foreground">{alert.category_name} budget threshold reached</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatCurrency(spent)} of {formatCurrency(limit)} spent ({Math.round(percentage)}%).
                  </div>
                  <ProgressBar value={percentage} tone="bg-destructive" />
                </div>
              </div>
            );
          })
        )}
      </WorkspaceCard>
    </div>
  );
}
