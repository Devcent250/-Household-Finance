'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  PieChart,
  Home,
  FolderTree,
  FileText,
  Bell,
  Settings,
  Users,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: DollarSign,
  },
  {
    id: 'income',
    label: 'Income',
    icon: TrendingUp,
  },
  {
    id: 'budgets',
    label: 'Budgets',
    icon: BarChart3,
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: Target,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: PieChart,
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: FolderTree,
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: Bell,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: Shield,
  },
];

const navGroups = [
  {
    title: 'Dashboard',
    items: ['overview', 'expenses', 'income', 'budgets', 'goals', 'analytics', 'categories', 'reports', 'alerts', 'settings', 'users', 'roles'],
  },
];

export default function Sidebar({ activeTab, onTabChange, isOpen = true, onClose }: SidebarProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);

  const filteredNavItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return navItems;
    }

    return navItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [search]);

  const filteredList = useMemo(() => {
    const itemMap = new Map(filteredNavItems.map((item) => [item.id, item]));
    return navGroups[0].items
      .map((id) => itemMap.get(id))
      .filter((item): item is (typeof navItems)[number] => Boolean(item));
  }, [filteredNavItems]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background/98 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out dark:bg-card md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 pt-20 md:pt-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col gap-3 p-4">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sidebar..."
            className="h-10 border-border bg-background"
          />

          <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredList.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                No matching items.
              </div>
            )}

            {filteredList.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 px-1 text-base font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => {
                    onTabChange(item.id);
                    onClose?.();
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-border">
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full bg-red-600 text-white hover:bg-red-700"
                >
                  Logout
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
                  <AlertDialogAction
                    onClick={() => {
                      localStorage.removeItem('userId');
                      localStorage.removeItem('userEmail');
                      router.push('/');
                    }}
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </aside>
    </>
  );
}
