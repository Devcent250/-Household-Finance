'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { TrendingUp, PieChart, Target, Zap } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/looooogo.png"
              alt="Household Budget Master"
              width={44}
              height={44}
              className="h-10 w-10 object-contain"
              priority
            />
            <h1 className="text-lg font-bold text-foreground">Household Finance</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
          <div className="space-y-5">
            <div className="space-y-3">
              <h2 className="max-w-xl text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Take Control of Your Finances
              </h2>
              <p className="max-w-lg text-sm lg:text-base text-muted-foreground leading-relaxed">
                Household Finance helps you track expenses, manage budgets, and reach your financial goals with ease.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <PieChart className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Track Expenses</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Categorize and monitor spending</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Set Budgets</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Control spending with smart limits</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Real-time Analytics</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Visual spending insights</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Financial Goals</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Track progress toward savings</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <Card className="relative w-full max-w-sm overflow-visible border-border/50 shadow-lg">
              {authError && (
                <div
                  role="alert"
                  className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-green-700 bg-green-600 px-4 py-3 text-sm text-white shadow-xl"
                >
                  <div className="font-semibold">{authError.title}</div>
                  <div className="mt-1">{authError.description}</div>
                </div>
              )}
              {authSuccess && (
                <div
                  role="status"
                  className="absolute left-4 right-4 top-4 z-20 rounded-lg border border-green-700 bg-green-600 px-4 py-3 text-sm text-white shadow-xl"
                >
                  <div className="font-semibold">{authSuccess.title}</div>
                  <div className="mt-1">{authSuccess.description}</div>
                </div>
              )}
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLogin
                    ? 'Sign in to access your financial dashboard'
                    : 'Start managing your finances today'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-3">
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
                        className="bg-card border-border h-10"
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
                      className="bg-card border-border h-10"
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
                      className="bg-card border-border h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full border border-green-700 bg-green-600 font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-70"
                  >
                    {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>

                <div className="mt-4 border-t border-border/50 pt-4 text-center">
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
          </div>
        </div>
      </div>

      <footer className="mt-10 border-t border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8 sm:text-sm">
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
