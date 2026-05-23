'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useCurrency } from '@/components/currency-provider';
import currencies from '@/currency_code/Common-Currency.json';
import { FeatureShell, PrimaryAction, WorkspaceCard } from './dashboard-ui';

interface SettingsPanelProps {
  userId: string;
}

const currencyOptions = Object.values(currencies)
  .map((currency) => ({
    code: currency.code,
    name: currency.name,
  }))
  .sort((a, b) => a.code.localeCompare(b.code));

export default function SettingsPanel({ userId }: SettingsPanelProps) {
  const { setCurrency } = useCurrency();
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    currency: 'USD',
    theme: 'light',
    password: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/profile'), {
      headers: { 'x-user-id': userId },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.data) {
          setProfile({
            full_name: data.data.full_name || '',
            email: data.data.email || '',
            currency: data.data.currency || 'USD',
            theme: data.data.theme || 'light',
            password: '',
          });
        }
      })
      .catch((error) => console.error('Error fetching profile:', error));
  }, [userId]);

  const handleSaveProfile = async () => {
    const response = await fetch(apiUrl('/api/profile'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(profile),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('userName', data.data.full_name || '');
      localStorage.setItem('userEmail', data.data.email || '');
      setCurrency(data.data.currency || profile.currency);
      setProfile((current) => ({ ...current, password: '' }));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <FeatureShell
      title="Settings"
      description="Update your profile, currency, theme preference, and account security settings."
      eyebrow={<span className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"><Settings className="h-4 w-4" /> Account preferences</span>}
    >
      <WorkspaceCard title="Profile Settings" description="These settings control your dashboard identity and display preferences.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full Name</Label>
            <Input
              id="profile-name"
              type="text"
              value={profile.full_name}
              onChange={(event) => setProfile((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={profile.email}
              onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
              placeholder="admin@demo.local"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={profile.currency} onValueChange={(value) => setProfile((current) => ({ ...current, currency: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Theme Preference</Label>
            <Select value={profile.theme} onValueChange={(value) => setProfile((current) => ({ ...current, theme: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="profile-password">New Password</Label>
            <Input
              id="profile-password"
              type="password"
              value={profile.password}
              onChange={(event) => setProfile((current) => ({ ...current, password: event.target.value }))}
              placeholder="Leave blank to keep current password"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PrimaryAction onClick={handleSaveProfile}>
            Save Profile
          </PrimaryAction>
          {saved && <span className="text-sm font-medium text-green-600">Profile saved</span>}
        </div>
      </WorkspaceCard>
    </FeatureShell>
  );
}
