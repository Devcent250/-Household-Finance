'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
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

const dashboardLinks = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

export default function Navigation({ onTabChange }: NavigationProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    setUserEmail(localStorage.getItem('userEmail') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Image
              src="/looooogo.png"
              alt="Household Budget Master"
              width={40}
              height={40}
              className="h-9 w-9 object-contain"
            />
            <h1 className="text-xl font-bold text-foreground">Household Finance</h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {dashboardLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleTabChange(link.id)}
                className="text-foreground underline decoration-double underline-offset-4 transition-colors hover:text-primary"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {userEmail && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Welcome, {userEmail}
              </span>
            )}
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="outline" className="border-border" onClick={() => handleTabChange('settings')}>
              Profile
            </Button>
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <span className="underline decoration-double underline-offset-4">Sign Out</span>
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
            className="md:hidden text-foreground"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="space-y-4">
              {dashboardLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleTabChange(link.id)}
                  className="block text-foreground underline decoration-double underline-offset-4 hover:text-primary"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 space-y-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <LanguageSelector />
                  <ThemeToggle />
                </div>
                <Button variant="outline" className="w-full border-border" onClick={() => handleTabChange('settings')}>
                  Profile
                </Button>
                <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full bg-primary text-primary-foreground">
                      <span className="underline decoration-double underline-offset-4">Sign Out</span>
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
