'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { TrendingUp, PieChart, Target, Zap } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Authentication failed');
        return;
      }

      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', data.email);
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
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
            <Card className="w-full max-w-sm border-border/50 shadow-lg">
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
                        placeholder="John Doe"
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
                      placeholder="admin@demo.local"
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
                      placeholder="********"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="bg-card border-border h-10"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
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
                        setError('');
                        setFormData({ email: '', password: '', name: '' });
                      }}
                      className="ml-1 cursor-pointer font-semibold text-primary transition-colors hover:text-primary/90"
                    >
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>

                <div className="mt-3 border-t border-border/50 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full border-border text-foreground hover:bg-muted"
                    onClick={() => {
                      localStorage.setItem('userId', 'demo-user');
                      localStorage.setItem('userEmail', 'demo@example.com');
                      router.push('/dashboard');
                    }}
                  >
                    Try Demo
                  </Button>
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
