'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, UserRound, X } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { LanguageSelector } from './language-selector';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NavigationProps {
  onTabChange: (tab: string) => void;
}

export default function Navigation({ onTabChange }: NavigationProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');

  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || '');
    setHouseholdName(localStorage.getItem('householdName') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    router.push('/');
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const displayName = userEmail ? userEmail.split('@')[0] : 'Account';

  return (
    <nav className="sticky top-0 z-50 border-b border-border/70 bg-background/92 shadow-sm shadow-slate-950/5 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
              <Image
                src="/looooogo.png"
                alt="Household Budget Master"
                width={30}
                height={30}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">Household Finance</h1>
              <p className="hidden truncate text-[11px] leading-4 text-muted-foreground sm:block">Dashboard workspace</p>
            </div>
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-1.5 md:flex">
            {householdName && (
              <div className="mr-1 flex min-w-0 max-w-[180px] items-center gap-1.5 rounded-lg border border-border bg-card/80 px-2.5 py-1.5 shadow-sm">
                <span className="truncate text-sm font-semibold text-foreground" style={{ textDecoration: 'underline double' }}>{householdName}</span>
              </div>
            )}
            {userEmail && (
              <div className="mr-1 flex min-w-0 max-w-[210px] items-center gap-2 rounded-lg border border-border bg-card/80 px-2.5 py-1.5 shadow-sm xl:max-w-[250px]">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-4 text-foreground">{displayName}</p>
                  <p className="hidden truncate text-[11px] leading-4 text-muted-foreground xl:block">{userEmail}</p>
                </div>
              </div>
            )}
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="outline" size="sm" className="h-9 border-border bg-card/80 px-2.5 shadow-sm xl:px-3" onClick={() => handleTabChange('settings')}>
              <UserRound className="h-4 w-4" />
              <span className="hidden xl:inline">Profile</span>
            </Button>
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="h-9 bg-primary px-2.5 text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 xl:px-3">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Sign Out</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out? You will need to log in again to continue.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/70 py-4 md:hidden">
            <div className="space-y-3">
              {userEmail && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                  {householdName && (
                    <span className="shrink-0 text-xs font-semibold text-foreground" style={{ textDecoration: 'underline double' }}>{householdName}</span>
                  )}
                </div>
              )}
              <div className="space-y-2 border-t border-border/70 pt-3">
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                  <ThemeToggle />
                </div>
                <Button variant="outline" className="w-full border-border bg-card" onClick={() => handleTabChange('settings')}>
                  <UserRound className="h-4 w-4" />
                  Profile
                </Button>
                <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-primary text-primary-foreground">
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm logout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out? You will need to log in again to continue.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
