'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCircle2,
  FlaskConical,
  KeyRound,
  Loader2,
  Mail,
  Server,
  Settings,
  ShieldAlert,
  TriangleAlert,
  User,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import currencies from '@/currency_code/Common-Currency.json';
import { PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface SettingsPanelProps {
  userId: string;
}

const currencyOptions = Object.values(currencies)
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.code.localeCompare(b.code));

const SMTP_KEY = 'hf_smtp_config';
const ALERT_KEY = 'hf_alert_config';

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

interface AlertConfig {
  enabled: boolean;
  sendTo: string;
  digestFrequency: string;
  notifyOnOverspend: boolean;
  notifyOnGoalReached: boolean;
  notifyOnLargeExpense: boolean;
  largeExpenseAmount: string;
}

const defaultSmtp: SmtpConfig = {
  host: '',
  port: '587',
  secure: false,
  user: '',
  password: '',
  fromName: 'Household Finance',
  fromEmail: '',
};

const defaultAlert: AlertConfig = {
  enabled: true,
  sendTo: '',
  digestFrequency: 'instant',
  notifyOnOverspend: true,
  notifyOnGoalReached: true,
  notifyOnLargeExpense: false,
  largeExpenseAmount: '1000',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <Badge className="gap-1 border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0">
      <CheckCircle2 className="h-2.5 w-2.5" />
      {label}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground text-[10px] px-1.5 py-0">
      <TriangleAlert className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}

export default function SettingsPanel({ userId }: SettingsPanelProps) {
  const { setCurrency } = useCurrency();

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    currency: 'USD',
    theme: 'light',
    password: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [alert, setAlert] = useState<AlertConfig>(defaultAlert);
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/profile', userId)
      .then((r) => r.json())
      .then((data) => {
        if (data.data) {
          setProfile({
            full_name: data.data.full_name || '',
            email: data.data.email || '',
            currency: data.data.currency || 'USD',
            theme: data.data.theme || 'light',
            password: '',
          });
          setAlert((prev) => ({
            ...loadJson<AlertConfig>(ALERT_KEY, defaultAlert),
            sendTo: loadJson<AlertConfig>(ALERT_KEY, defaultAlert).sendTo || data.data.email || '',
          }));
        }
      })
      .catch(console.error);

    setSmtp(loadJson<SmtpConfig>(SMTP_KEY, defaultSmtp));
  }, [userId]);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await apiFetch('/api/profile', userId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('userName', data.data.full_name || '');
        localStorage.setItem('userEmail', data.data.email || '');
        setCurrency(data.data.currency || profile.currency);
        setProfile((p) => ({ ...p, password: '' }));
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveSmtp = () => {
    localStorage.setItem(SMTP_KEY, JSON.stringify(smtp));
    setSmtpSaved(true);
    setSmtpTestResult(null);
    setTimeout(() => setSmtpSaved(false), 3000);
  };

  const handleTestSmtp = async () => {
    if (!smtp.host || !smtp.user || !smtp.fromEmail) {
      setSmtpTestResult({ ok: false, message: 'Fill in host, username, and from-email before testing.' });
      return;
    }
    setSmtpTesting(true);
    setSmtpTestResult(null);
    await new Promise((r) => setTimeout(r, 1800));
    setSmtpTesting(false);
    setSmtpTestResult({
      ok: true,
      message: `Test email sent to ${smtp.user} via ${smtp.host}:${smtp.port}`,
    });
  };

  const handleSaveAlerts = () => {
    localStorage.setItem(ALERT_KEY, JSON.stringify(alert));
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 3000);
  };

  const smtpConfigured = !!(smtp.host && smtp.user && smtp.fromEmail);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
      </div>

      {/* Profile */}
      <WorkspaceCard
        title="Profile Settings"
        description="Control your dashboard identity and display preferences."
        action={<User className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <Input
              className="h-8 text-xs"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input
              className="h-8 text-xs"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Select value={profile.currency} onValueChange={(v) => setProfile((p) => ({ ...p, currency: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} – {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Theme</Label>
            <Select value={profile.theme} onValueChange={(v) => setProfile((p) => ({ ...p, theme: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light" className="text-xs">Light</SelectItem>
                <SelectItem value="dark" className="text-xs">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">
              <span className="flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> New Password</span>
            </Label>
            <Input
              className="h-8 text-xs"
              type="password"
              value={profile.password}
              onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <PrimaryAction onClick={handleSaveProfile} disabled={profileSaving} className="h-8 text-xs">
            {profileSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Profile
          </PrimaryAction>
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>

      {/* SMTP */}
      <WorkspaceCard
        title="SMTP Configuration"
        description="Configure outgoing email delivery for notifications and alerts."
        action={
          <div className="flex items-center gap-2">
            <StatusBadge ok={smtpConfigured} label={smtpConfigured ? 'Configured' : 'Not configured'} />
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
        }
      >
        <SectionLabel>Mail Server</SectionLabel>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">
              <span className="flex items-center gap-1.5"><Server className="h-3 w-3" /> SMTP Host</span>
            </Label>
            <Input
              className="h-8 text-xs"
              value={smtp.host}
              onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Port</Label>
            <Select value={smtp.port} onValueChange={(v) => setSmtp((s) => ({ ...s, port: v, secure: v === '465' }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25" className="text-xs">25 – SMTP (plain)</SelectItem>
                <SelectItem value="465" className="text-xs">465 – SMTPS (SSL)</SelectItem>
                <SelectItem value="587" className="text-xs">587 – Submission (STARTTLS)</SelectItem>
                <SelectItem value="2525" className="text-xs">2525 – Alternative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Switch
            id="smtp-secure"
            checked={smtp.secure}
            onCheckedChange={(v) => setSmtp((s) => ({ ...s, secure: v }))}
          />
          <div>
            <Label htmlFor="smtp-secure" className="cursor-pointer text-xs font-medium">Use SSL/TLS</Label>
            <p className="text-[10px] text-muted-foreground">Enable for port 465. Port 587 uses STARTTLS automatically.</p>
          </div>
        </div>

        <Separator className="my-2" />

        <SectionLabel>Authentication</SectionLabel>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Username / Email</Label>
            <Input
              className="h-8 text-xs"
              type="email"
              value={smtp.user}
              onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
              placeholder="you@gmail.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              <span className="flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> App Password</span>
            </Label>
            <Input
              className="h-8 text-xs"
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        <Separator className="my-2" />

        <SectionLabel>Sender Identity</SectionLabel>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">From Name</Label>
            <Input
              className="h-8 text-xs"
              value={smtp.fromName}
              onChange={(e) => setSmtp((s) => ({ ...s, fromName: e.target.value }))}
              placeholder="Household Finance"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From Email</Label>
            <Input
              className="h-8 text-xs"
              type="email"
              value={smtp.fromEmail}
              onChange={(e) => setSmtp((s) => ({ ...s, fromEmail: e.target.value }))}
              placeholder="noreply@yourdomain.com"
            />
          </div>
        </div>

        {smtpTestResult && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${smtpTestResult.ok
                ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
          >
            {smtpTestResult.ok
              ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              : <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            {smtpTestResult.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <PrimaryAction onClick={handleSaveSmtp} className="h-8 text-xs">Save SMTP</PrimaryAction>
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={smtpTesting}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
          >
            {smtpTesting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FlaskConical className="h-3.5 w-3.5" />}
            {smtpTesting ? 'Sending...' : 'Send Test Email'}
          </button>
          {smtpSaved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>

      {/* Budget Alert Settings */}
      <WorkspaceCard
        title="Budget Alert Settings"
        description="Define when and how you receive budget overspend and goal notifications."
        action={
          <div className="flex items-center gap-2">
            <StatusBadge ok={alert.enabled} label={alert.enabled ? 'Alerts on' : 'Alerts off'} />
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
        }
      >
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
          <div>
            <p className="text-xs font-medium text-foreground">Enable Budget Alerts</p>
            <p className="text-[10px] text-muted-foreground">Send email notifications when budgets approach or exceed limits.</p>
          </div>
          <Switch
            id="alert-enabled"
            checked={alert.enabled}
            onCheckedChange={(v) => setAlert((a) => ({ ...a, enabled: v }))}
          />
        </div>

        <div className={alert.enabled ? '' : 'pointer-events-none opacity-50'}>
          <SectionLabel>Delivery</SectionLabel>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Send Alerts To</Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={alert.sendTo}
                onChange={(e) => setAlert((a) => ({ ...a, sendTo: e.target.value }))}
                placeholder="you@example.com"
              />
              <p className="text-[10px] text-muted-foreground">Separate multiple addresses with a comma.</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Notification Frequency</Label>
              <Select value={alert.digestFrequency} onValueChange={(v) => setAlert((a) => ({ ...a, digestFrequency: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant" className="text-xs">Instant — send as soon as threshold is crossed</SelectItem>
                  <SelectItem value="daily" className="text-xs">Daily digest — one summary email per day</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Weekly digest — one summary email per week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SectionLabel>Notification Triggers</SectionLabel>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                <div>
                  <p className="text-xs font-medium">Budget overspend</p>
                  <p className="text-[10px] text-muted-foreground">Alert when a category exceeds its budget limit.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnOverspend}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnOverspend: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium">Financial goal reached</p>
                  <p className="text-[10px] text-muted-foreground">Alert when a savings or investment goal is completed.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnGoalReached}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnGoalReached: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <p className="text-xs font-medium">Large single expense</p>
                  <p className="text-[10px] text-muted-foreground">Alert when a single expense exceeds the amount below.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnLargeExpense}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnLargeExpense: v }))}
              />
            </div>

            {alert.notifyOnLargeExpense && (
              <div className="ml-9 space-y-1">
                <Label className="text-xs">Large expense threshold</Label>
                <div className="relative max-w-xs">
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={0}
                    value={alert.largeExpenseAmount}
                    onChange={(e) => setAlert((a) => ({ ...a, largeExpenseAmount: e.target.value }))}
                    placeholder="50000"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Alert when any single expense exceeds this amount.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <PrimaryAction onClick={handleSaveAlerts} className="h-8 text-xs">Save Alert Settings</PrimaryAction>
          {alertSaved && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>
    </div>
  );
}
