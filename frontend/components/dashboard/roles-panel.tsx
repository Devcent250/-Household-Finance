import { ShieldCheck } from 'lucide-react';
import { FeatureShell, WorkspaceCard } from './dashboard-ui';

const roles = [
  { name: 'Owner', permissions: 'Full access to all features' },
  { name: 'Member', permissions: 'Add expenses and view reports' },
  { name: 'Viewer', permissions: 'Read-only access to dashboards' },
];

export default function RolesPanel() {
  return (
    <FeatureShell
      title="Roles"
      description="Define access levels so each household member sees only what they need."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Access model</span>}
    >
      <WorkspaceCard title="Role Templates" description="Reusable permission templates for household workspace access.">
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.name} className="rounded-xl border border-border bg-background/70 px-4 py-3 shadow-sm">
              <div className="font-medium text-foreground">{role.name}</div>
              <div className="text-sm text-muted-foreground">{role.permissions}</div>
            </div>
          ))}
        </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
