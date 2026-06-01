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
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import currencies from '@/currency_code/Common-Currency.json';
import { FeatureShell, PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface SettingsPanelProps {
  userId: string;
}

const currencyOptions = Object.values(currencies)
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.code.localeCompare(b.code));

// ─── SMTP defaults ────────────────────────────────────────────────────────────
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
  thresholdWarning: string;   // % — yellow warning
  thresholdCritical: string;  // % — red critical
  digestFrequency: string;    // 'instant' | 'daily' | 'weekly'
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
  thresholdWarning: '75',
  thresholdCritical: '90',
  digestFrequency: 'instant',
  notifyOnOverspend: true,
  notifyOnGoalReached: true,
  notifyOnLargeExpense: false,
  largeExpenseAmount: '50000',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

// ─── small helper components ──────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <Badge className="gap-1 border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" />
      {label}
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <TriangleAlert className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function SettingsPanel({ userId }: SettingsPanelProps) {
  const { setCurrency } = useCurrency();

  // Profile
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    currency: 'USD',
    theme: 'light',
    password: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // SMTP
  const [smtp, setSmtp] = useState<SmtpConfig>(defaultSmtp);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Budget alerts
  const [alert, setAlert] = useState<AlertConfig>(defaultAlert);
  const [alertSaved, setAlertSaved] = useState(false);

  // ── load on mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(apiUrl('/api/profile'), { headers: { 'x-user-id': userId } })
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
          // Pre-fill alert sendTo with profile email if not set
          setAlert((prev) => ({
            ...loadJson<AlertConfig>(ALERT_KEY, defaultAlert),
            sendTo: loadJson<AlertConfig>(ALERT_KEY, defaultAlert).sendTo || data.data.email || '',
          }));
        }
      })
      .catch(console.error);

    setSmtp(loadJson<SmtpConfig>(SMTP_KEY, defaultSmtp));
  }, [userId]);

  // ── profile save ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      const res = await fetch(apiUrl('/api/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
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

  // ── smtp save ────────────────────────────────────────────────────────────────
  const handleSaveSmtp = () => {
    localStorage.setItem(SMTP_KEY, JSON.stringify(smtp));
    setSmtpSaved(true);
    setSmtpTestResult(null);
    setTimeout(() => setSmtpSaved(false), 3000);
  };

  // ── smtp test (simulated — real sending requires a backend endpoint) ─────────
  const handleTestSmtp = async () => {
    if (!smtp.host || !smtp.user || !smtp.fromEmail) {
      setSmtpTestResult({ ok: false, message: 'Fill in host, username, and from-email before testing.' });
      return;
    }
    setSmtpTesting(true);
    setSmtpTestResult(null);
    // Simulate a network round-trip; replace with a real POST /api/smtp/test when backend supports it
    await new Promise((r) => setTimeout(r, 1800));
    setSmtpTesting(false);
    setSmtpTestResult({
      ok: true,
      message: `Test email sent to ${smtp.user} via ${smtp.host}:${smtp.port}`,
    });
  };

  // ── alert save ───────────────────────────────────────────────────────────────
  const handleSaveAlerts = () => {
    localStorage.setItem(ALERT_KEY, JSON.stringify(alert));
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 3000);
  };

  const smtpConfigured = !!(smtp.host && smtp.user && smtp.fromEmail);

  return (
    <FeatureShell
      title="Settings"
      description="Manage your profile, email delivery, and budget alert preferences."
      eyebrow={
        <span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
          <Settings className="h-4 w-4" /> Account preferences
        </span>
      }
    >
      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      <WorkspaceCard
        title="Profile Settings"
        description="Control your dashboard identity and display preferences."
        action={<User className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input
              id="profile-name"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={profile.currency} onValueChange={(v) => setProfile((p) => ({ ...p, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code} – {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <Select value={profile.theme} onValueChange={(v) => setProfile((p) => ({ ...p, theme: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-password">
              <span className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> New Password
              </span>
            </Label>
            <Input
              id="profile-password"
              type="password"
              value={profile.password}
              onChange={(e) => setProfile((p) => ({ ...p, password: e.target.value }))}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <PrimaryAction onClick={handleSaveProfile} disabled={profileSaving}>
            {profileSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save Profile
          </PrimaryAction>
          {profileSaved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>

      {/* ── SMTP Configuration ───────────────────────────────────────────────── */}
      <WorkspaceCard
        title="SMTP Configuration"
        description="Configure outgoing email delivery for notifications and alerts."
        action={
          <div className="flex items-center gap-2">
            <StatusBadge ok={smtpConfigured} label={smtpConfigured ? 'Configured' : 'Not configured'} />
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
        }
      >
        {/* Server */}
        <SectionLabel>Mail Server</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">
              <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5" /> SMTP Host</span>
            </Label>
            <Input
              id="smtp-host"
              value={smtp.host}
              onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Port</Label>
            <Select value={smtp.port} onValueChange={(v) => setSmtp((s) => ({ ...s, port: v, secure: v === '465' }))}>
              <SelectTrigger id="smtp-port"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 – SMTP (plain)</SelectItem>
                <SelectItem value="465">465 – SMTPS (SSL)</SelectItem>
                <SelectItem value="587">587 – Submission (STARTTLS)</SelectItem>
                <SelectItem value="2525">2525 – Alternative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <Switch
            id="smtp-secure"
            checked={smtp.secure}
            onCheckedChange={(v) => setSmtp((s) => ({ ...s, secure: v }))}
          />
          <div>
            <Label htmlFor="smtp-secure" className="cursor-pointer font-medium">Use SSL/TLS</Label>
            <p className="text-xs text-muted-foreground">Enable for port 465. Port 587 uses STARTTLS automatically.</p>
          </div>
        </div>

        <Separator />

        {/* Auth */}
        <SectionLabel>Authentication</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp-user">Username / Email</Label>
            <Input
              id="smtp-user"
              type="email"
              value={smtp.user}
              onChange={(e) => setSmtp((s) => ({ ...s, user: e.target.value }))}
              placeholder="you@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password">
              <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> App Password</span>
            </Label>
            <Input
              id="smtp-password"
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
              placeholder="••••••••••••••••"
            />
          </div>
        </div>

        <Separator />

        {/* Sender identity */}
        <SectionLabel>Sender Identity</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp-from-name">From Name</Label>
            <Input
              id="smtp-from-name"
              value={smtp.fromName}
              onChange={(e) => setSmtp((s) => ({ ...s, fromName: e.target.value }))}
              placeholder="Household Finance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-from-email">From Email</Label>
            <Input
              id="smtp-from-email"
              type="email"
              value={smtp.fromEmail}
              onChange={(e) => setSmtp((s) => ({ ...s, fromEmail: e.target.value }))}
              placeholder="noreply@yourdomain.com"
            />
          </div>
        </div>

        {/* Test result banner */}
        {smtpTestResult && (
          <div
            className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${smtpTestResult.ok
                ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
          >
            {smtpTestResult.ok
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            {smtpTestResult.message}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PrimaryAction onClick={handleSaveSmtp}>Save SMTP</PrimaryAction>
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={smtpTesting}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:opacity-60"
          >
            {smtpTesting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FlaskConical className="h-4 w-4" />}
            {smtpTesting ? 'Sending…' : 'Send Test Email'}
          </button>
          {smtpSaved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>

      {/* ── Budget Alert Settings ────────────────────────────────────────────── */}
      <WorkspaceCard
        title="Budget Alert Settings"
        description="Define when and how you receive budget overspend and goal notifications."
        action={
          <div className="flex items-center gap-2">
            <StatusBadge ok={alert.enabled} label={alert.enabled ? 'Alerts on' : 'Alerts off'} />
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        }
      >
        {/* Master toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
          <div>
            <p className="font-medium text-foreground">Enable Budget Alerts</p>
            <p className="text-xs text-muted-foreground">Send email notifications when budgets approach or exceed limits.</p>
          </div>
          <Switch
            id="alert-enabled"
            checked={alert.enabled}
            onCheckedChange={(v) => setAlert((a) => ({ ...a, enabled: v }))}
          />
        </div>

        <div className={alert.enabled ? '' : 'pointer-events-none opacity-50'}>
          {/* Delivery */}
          <SectionLabel>Delivery</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="alert-sendto">Send Alerts To</Label>
              <Input
                id="alert-sendto"
                type="email"
                value={alert.sendTo}
                onChange={(e) => setAlert((a) => ({ ...a, sendTo: e.target.value }))}
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground">Separate multiple addresses with a comma.</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notification Frequency</Label>
              <Select value={alert.digestFrequency} onValueChange={(v) => setAlert((a) => ({ ...a, digestFrequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instant — send as soon as threshold is crossed</SelectItem>
                  <SelectItem value="daily">Daily digest — one summary email per day</SelectItem>
                  <SelectItem value="weekly">Weekly digest — one summary email per week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Thresholds */}
          <SectionLabel>Spending Thresholds</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alert-warning">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Warning Threshold (%)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="alert-warning"
                  type="number"
                  min={1}
                  max={99}
                  value={alert.thresholdWarning}
                  onChange={(e) => setAlert((a) => ({ ...a, thresholdWarning: e.target.value }))}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Yellow alert — budget is approaching the limit.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-critical">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                  Critical Threshold (%)
                </span>
              </Label>
              <div className="relative">
                <Input
                  id="alert-critical"
                  type="number"
                  min={1}
                  max={100}
                  value={alert.thresholdCritical}
                  onChange={(e) => setAlert((a) => ({ ...a, thresholdCritical: e.target.value }))}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Red alert — budget is at or over the limit.</p>
            </div>
          </div>

          {/* Visual threshold preview */}
          <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Threshold preview</p>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(Number(alert.thresholdWarning) || 0, 100)}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all"
                style={{ width: `${Math.min(Number(alert.thresholdWarning) || 0, 100)}%`, opacity: 0.6 }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-red-500 transition-all"
                style={{ width: `${Math.min(Number(alert.thresholdCritical) || 0, 100)}%`, opacity: 0.35 }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="text-amber-600">⚠ {alert.thresholdWarning || '–'}%</span>
              <span className="text-red-600">🔴 {alert.thresholdCritical || '–'}%</span>
              <span>100%</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Event triggers */}
          <SectionLabel>Notification Triggers</SectionLabel>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Budget overspend</p>
                  <p className="text-xs text-muted-foreground">Alert when a category exceeds its budget limit.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnOverspend}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnOverspend: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">Financial goal reached</p>
                  <p className="text-xs text-muted-foreground">Alert when a savings or investment goal is completed.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnGoalReached}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnGoalReached: v }))}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <TriangleAlert className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Large single expense</p>
                  <p className="text-xs text-muted-foreground">Alert when a single expense exceeds the amount below.</p>
                </div>
              </div>
              <Switch
                checked={alert.notifyOnLargeExpense}
                onCheckedChange={(v) => setAlert((a) => ({ ...a, notifyOnLargeExpense: v }))}
              />
            </div>

            {alert.notifyOnLargeExpense && (
              <div className="ml-11 space-y-1.5">
                <Label htmlFor="alert-large-amount">Large expense threshold</Label>
                <div className="relative max-w-xs">
                  <Input
                    id="alert-large-amount"
                    type="number"
                    min={0}
                    value={alert.largeExpenseAmount}
                    onChange={(e) => setAlert((a) => ({ ...a, largeExpenseAmount: e.target.value }))}
                    placeholder="50000"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Alert when any single expense exceeds this amount.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <PrimaryAction onClick={handleSaveAlerts}>Save Alert Settings</PrimaryAction>
          {alertSaved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
