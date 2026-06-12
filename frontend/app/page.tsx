'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { ArrowRight, PieChart, Target, TrendingUp, Zap } from 'lucide-react';
import { apiUrl } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const errorTimeoutRef = useRef<number | null>(null);
  const [currentYear, setCurrentYear] = useState(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<{ title: string; description: string } | null>(null);
  const [authSuccess, setAuthSuccess] = useState<{ title: string; description: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const showAuthError = (title: string, description: string) => {
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }

    setAuthError({ title, description });
    errorTimeoutRef.current = window.setTimeout(() => {
      setAuthError(null);
      errorTimeoutRef.current = null;
    }, 3500);
  };

  const showAuthSuccess = (title: string, description: string) => {
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }

    setAuthError(null);
    setAuthSuccess({ title, description });
    errorTimeoutRef.current = window.setTimeout(() => {
      setAuthSuccess(null);
      errorTimeoutRef.current = null;
    }, 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthSuccess(null);
        showAuthError('Sign in failed', data.message || 'Authentication failed');
        return;
      }

      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userName', data.fullName || formData.name || '');
      if (data.permissions) localStorage.setItem('userPermissions', JSON.stringify(data.permissions));
      if (data.isOwner !== undefined) localStorage.setItem('isOwner', String(data.isOwner));
      if (data.household) {
        localStorage.setItem('householdId', String(data.household.id));
        localStorage.setItem('householdName', data.household.name);
      }

      if (data.isSuperAdmin && !data.household) {
        router.push('/setup');
      } else if (data.household) {
        router.push('/dashboard');
      } else {
        router.push('/pending');
      }
    } catch (err) {
      setAuthSuccess(null);
      showAuthError('Connection error', 'An error occurred. Please try again.');
      console.error('[v0] Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="finance-grid-bg pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
              <Image
                src="/looooogo.png"
                alt="Household Budget Master"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">Household Finance</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-110px)] max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-5">
            <div className="space-y-3">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Take Control of Your Household Money
              </h2>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Track expenses, income, budgets, goals, and reports in one focused dashboard built for day-to-day family decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="group flex gap-2.5 rounded-lg border border-border bg-card/85 p-3.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PieChart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Track Expenses</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Categorize spending and spot patterns quickly.</p>
                </div>
              </div>

              <div className="group flex gap-2.5 rounded-lg border border-border bg-card/85 p-3.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Set Budgets</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Control monthly categories with clear limits.</p>
                </div>
              </div>

              <div className="group flex gap-2.5 rounded-lg border border-border bg-card/85 p-3.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Real-time Analytics</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Review income, expenses, and trends visually.</p>
                </div>
              </div>

              <div className="group flex gap-2.5 rounded-lg border border-border bg-card/85 p-3.5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Financial Goals</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Measure savings progress without spreadsheets.</p>
                </div>
              </div>
            </div>

          </section>

          <section className="flex justify-center lg:justify-end">
            <Card className="relative w-full max-w-sm overflow-visible border-border/70 bg-card/95 shadow-2xl shadow-slate-950/10 backdrop-blur">
              {authError && (
                <div
                  role="alert"
                  className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-destructive/30 bg-destructive px-3 py-2 text-sm text-destructive-foreground shadow-xl"
                >
                  <div className="font-semibold">{authError.title}</div>
                  <div className="mt-1">{authError.description}</div>
                </div>
              )}
              {authSuccess && (
                <div
                  role="status"
                  className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-primary/30 bg-primary px-3 py-2 text-sm text-primary-foreground shadow-xl"
                >
                  <div className="font-semibold">{authSuccess.title}</div>
                  <div className="mt-1">{authSuccess.description}</div>
                </div>
              )}
              <CardHeader className="space-y-1.5 pb-3">
                <CardTitle className="text-xl tracking-tight">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-sm leading-5">
                  {isLogin
                    ? 'Sign in to access your financial dashboard'
                    : 'Start managing your finances today'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <Input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                        className="h-10 border-input bg-background/70 text-sm shadow-sm focus-visible:ring-primary/25"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="h-10 border-input bg-background/70 text-sm shadow-sm focus-visible:ring-primary/25"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-10 border-input bg-background/70 text-sm shadow-sm focus-visible:ring-primary/25"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 disabled:opacity-70"
                  >
                    {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="mt-4 border-t border-border/70 pt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account?" : 'Already have an account?'}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setAuthError(null);
                        setAuthSuccess(null);
                        setFormData({ email: '', password: '', name: '' });
                      }}
                      className="ml-1 cursor-pointer font-semibold text-primary transition-colors hover:text-primary/90"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>

              </CardContent>
            </Card>
          </section>
      </main>

      <footer className="relative z-10 border-t border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-3 text-center text-xs text-muted-foreground">
          <Image
            src="/looooogo.png"
            alt="Household Budget Master"
            width={22}
            height={22}
            className="h-5 w-5 object-contain"
          />
          <p>Copyright &copy; {currentYear} Household Finance. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
