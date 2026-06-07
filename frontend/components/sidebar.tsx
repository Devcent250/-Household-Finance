'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { apiFetch } from '@/lib/api';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const tabPermissions: Record<string, string[]> = {
  overview: ['dashboard:view'],
  expenses: ['expenses:view'],
  income: ['income:view'],
  budgets: ['budgets:view'],
  goals: ['goals:view'],
  analytics: ['analytics:view'],
  categories: ['categories:manage'],
  reports: ['reports:view'],
  alerts: ['budgets:view'],
  settings: ['settings:manage'],
  users: ['members:manage'],
  roles: ['roles:manage'],
};

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
  const [householdName, setHouseholdName] = useState('');
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setHouseholdName(localStorage.getItem('householdName') || '');
    const storedPerms = localStorage.getItem('userPermissions');
    const storedIsOwner = localStorage.getItem('isOwner');
    if (storedPerms) {
      setUserPermissions(new Set(JSON.parse(storedPerms)));
      if (storedIsOwner) setIsOwner(storedIsOwner === 'true');
    }
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    apiFetch('/api/households/my-permissions', userId)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUserPermissions(new Set(data.data.permissions || []));
          setIsOwner(data.data.isOwner);
          setIsSuperAdmin(data.data.isSuperAdmin);
          localStorage.setItem('userPermissions', JSON.stringify(data.data.permissions || []));
          localStorage.setItem('isOwner', String(data.data.isOwner));
        }
      })
      .catch(() => {});
  }, []);

  const hasAccess = (tabId: string) => {
    if (isOwner || isSuperAdmin) return true;
    const required = tabPermissions[tabId];
    if (!required || required.length === 0) return true;
    return required.some((p) => userPermissions.has(p));
  };

  const visibleNavItems = useMemo(() => navItems.filter((item) => hasAccess(item.id)), [userPermissions, isOwner, isSuperAdmin]);

  const filteredNavItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return visibleNavItems;
    }

    return visibleNavItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [search, visibleNavItems]);

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
          'fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-background/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out dark:bg-card md:sticky md:top-10 md:h-[calc(100vh-2.5rem)] md:translate-x-0 pt-20 md:pt-0'
        )}
      >
        <div className="flex h-full flex-col gap-2 p-2">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sidebar..."
            className="h-8 rounded-lg border-border bg-card shadow-sm text-xs"
          />

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {filteredList.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
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
                    'h-8 w-full justify-start gap-2 rounded-lg px-2 text-xs font-medium',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => {
                    onTabChange(item.id);
                    onClose?.();
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          <div className="border-t border-border pt-2 space-y-1">
            <div className="px-2 text-[10px] text-muted-foreground">
              {householdName || 'No household'}
            </div>
            <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 text-xs"
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
                      localStorage.removeItem('householdId');
                      localStorage.removeItem('householdName');
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
