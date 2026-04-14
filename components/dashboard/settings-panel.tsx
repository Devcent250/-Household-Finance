'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const settings = [
  'Language selection',
  'Theme preference',
  'Notification settings',
  'Profile and account management',
];

export default function SettingsPanel() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile({
      name: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
      password: '',
    });
  }, []);

  const handleSaveProfile = () => {
    if (profile.name.trim()) {
      localStorage.setItem('userName', profile.name.trim());
    }

    if (profile.email.trim()) {
      localStorage.setItem('userEmail', profile.email.trim());
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Update your account information here. This keeps your profile details in one place.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                className="h-10 border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="admin@demo.local"
                className="h-10 border-border bg-background"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <Input
                type="password"
                value={profile.password}
                onChange={(e) => setProfile((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="********"
                className="h-10 border-border bg-background"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSaveProfile} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <span className="underline decoration-double underline-offset-4">Save Profile</span>
            </Button>
            {saved && <span className="text-sm font-medium text-green-600">Profile saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure the household app experience and personal preferences.
          </p>
          <div className="space-y-2">
            {settings.map((setting) => (
              <div key={setting} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                {setting}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
