'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { ArrowRight, CircleDollarSign, PieChart, ShieldCheck, Target, TrendingUp, WalletCards, Zap } from 'lucide-react';
import { apiUrl } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const errorTimeoutRef = useRef<number | null>(null);
  const currentYear = new Date().getFullYear();
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState<{ title: string; description: string } | null>(null);
  const [authSuccess, setAuthSuccess] = useState<{ title: string; description: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

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

      if (!isLogin) {
        showAuthSuccess('Account created', 'Your account is ready. Please sign in.');
        setIsLogin(true);
        setFormData({
          email: formData.email,
          password: '',
          name: '',
        });
        return;
      }

      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userName', data.fullName || formData.name || '');
      router.push('/dashboard');
    } catch (err) {
      setAuthSuccess(null);
      showAuthError('Connection error', 'An error occurred. Please try again.');
      console.error('[v0] Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      const response = await fetch(apiUrl('/api/auth/demo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (!response.ok) {
        showAuthError('Demo unavailable', data.message || data.error || 'Could not start demo account');
        return;
      }

      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('userName', data.fullName || 'Demo Household');
      router.push('/dashboard');
    } catch (err) {
      showAuthError('Connection error', 'The backend is not responding. Please start the API server.');
      console.error('[v0] Demo auth error:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="finance-grid-bg pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute left-0 top-0 h-80 w-80 rounded-full bg-primary/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 right-0 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-400/10" />

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
              <Image
                src="/looooogo.png"
                alt="Household Budget Master"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">Household Finance</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Budgeting for real homes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-145px)] max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-12">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <ShieldCheck className="h-4 w-4" />
              Private household finance workspace
            </div>

            <div className="space-y-4">
              <h2 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Take Control of Your Household Money
              </h2>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Track expenses, income, budgets, goals, and reports in one focused dashboard built for day-to-day family decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="group flex gap-3 rounded-lg border border-border bg-card/85 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Track Expenses</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Categorize spending and spot patterns quickly.</p>
                </div>
              </div>

              <div className="group flex gap-3 rounded-lg border border-border bg-card/85 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Set Budgets</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Control monthly categories with clear limits.</p>
                </div>
              </div>

              <div className="group flex gap-3 rounded-lg border border-border bg-card/85 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-amber-700 dark:text-amber-300">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Real-time Analytics</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Review income, expenses, and trends visually.</p>
                </div>
              </div>

              <div className="group flex gap-3 rounded-lg border border-border bg-card/85 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Financial Goals</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Measure savings progress without spreadsheets.</p>
                </div>
              </div>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3 border-t border-border/70 pt-5">
              <div>
                <p className="text-2xl font-semibold text-foreground">360</p>
                <p className="text-xs text-muted-foreground">finance view</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground">local access</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">shared budget</p>
              </div>
            </div>
          </section>

          <section className="flex justify-center lg:justify-end">
            <Card className="relative w-full max-w-md overflow-visible border-border/70 bg-card/95 shadow-2xl shadow-slate-950/10 backdrop-blur">
              {authError && (
                <div
                  role="alert"
                  className="absolute left-5 right-5 top-5 z-20 rounded-lg border border-destructive/30 bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-xl"
                >
                  <div className="font-semibold">{authError.title}</div>
                  <div className="mt-1">{authError.description}</div>
                </div>
              )}
              {authSuccess && (
                <div
                  role="status"
                  className="absolute left-5 right-5 top-5 z-20 rounded-lg border border-primary/30 bg-primary px-4 py-3 text-sm text-primary-foreground shadow-xl"
                >
                  <div className="font-semibold">{authSuccess.title}</div>
                  <div className="mt-1">{authSuccess.description}</div>
                </div>
              )}
              <CardHeader className="space-y-2 pb-5">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <WalletCards className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl tracking-tight">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-sm leading-6">
                  {isLogin
                    ? 'Sign in to access your financial dashboard'
                    : 'Start managing your finances today'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <Input
                        type="text"
                        name="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required={!isLogin}
                        className="h-11 border-input bg-background/70 shadow-sm focus-visible:ring-primary/25"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="h-11 border-input bg-background/70 shadow-sm focus-visible:ring-primary/25"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input
                      type="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-11 border-input bg-background/70 shadow-sm focus-visible:ring-primary/25"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 disabled:opacity-70"
                  >
                    {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                {isLogin && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={demoLoading}
                    onClick={handleDemoLogin}
                    className="mt-3 h-11 w-full border-border bg-background/50 font-semibold hover:bg-secondary"
                  >
                    <CircleDollarSign className="h-4 w-4" />
                    {demoLoading ? 'Opening demo...' : 'Use Demo Account'}
                  </Button>
                )}

                <div className="mt-5 border-t border-border/70 pt-5 text-center">
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
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8 sm:text-sm">
          <Image
            src="/looooogo.png"
            alt="Household Budget Master"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <p>(c) {currentYear} Household Finance. Take control of your finances today.</p>
        </div>
      </footer>
    </div>
  );
}
