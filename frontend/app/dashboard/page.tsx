'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyProvider } from '@/components/currency-provider';
import Navigation from '@/components/navigation';
import Sidebar from '@/components/sidebar';

const DashboardOverview = dynamic(() => import('@/components/dashboard/overview'), { ssr: false });
const ExpenseTracker = dynamic(() => import('@/components/dashboard/expense-tracker'), { ssr: false });
const BudgetManager = dynamic(() => import('@/components/dashboard/budget-manager'), { ssr: false });
const IncomeTracker = dynamic(() => import('@/components/dashboard/income-tracker'), { ssr: false });
const FinancialGoals = dynamic(() => import('@/components/dashboard/financial-goals'), { ssr: false });
const Analytics = dynamic(() => import('@/components/dashboard/analytics'), { ssr: false });
const CategoriesPanel = dynamic(() => import('@/components/dashboard/categories-panel'), { ssr: false });
const ReportsPanel = dynamic(() => import('@/components/dashboard/reports-panel'), { ssr: false });
const AlertsPanel = dynamic(() => import('@/components/dashboard/alerts-panel'), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/dashboard/settings-panel'), { ssr: false });
const UsersPanel = dynamic(() => import('@/components/dashboard/users-panel'), { ssr: false });
const RolesPanel = dynamic(() => import('@/components/dashboard/roles-panel'), { ssr: false });

const dashboardTabs = new Set([
  'overview',
  'expenses',
  'income',
  'budgets',
  'goals',
  'analytics',
  'categories',
  'reports',
  'alerts',
  'settings',
  'users',
  'roles',
]);

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

const tabToPath = (tab: string) => (tab === 'overview' ? '/dashboard' : `/dashboard/${tab}`);

const getTabFromPath = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean)[1];
  return segment && dashboardTabs.has(segment) ? segment : 'overview';
};

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/');
      return;
    }
    const storedHouseholdId = localStorage.getItem('householdId');
    if (!storedHouseholdId) {
      router.push('/setup');
      return;
    }
    setUserId(storedUserId);
    const storedPerms = localStorage.getItem('userPermissions');
    const storedIsOwner = localStorage.getItem('isOwner');
    if (storedPerms) {
      setUserPermissions(new Set(JSON.parse(storedPerms)));
      if (storedIsOwner) setIsOwner(storedIsOwner === 'true');
    }
  }, [router]);

  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
  }, [pathname]);

  const hasTabAccess = (tab: string) => {
    if (isOwner) return true;
    const required = tabPermissions[tab];
    if (!required || required.length === 0) return true;
    return required.some((p) => userPermissions.has(p));
  };

  const firstAccessibleTab = () => {
    if (isOwner) return activeTab;
    for (const tab of dashboardTabs) {
      if (tab === 'overview') continue;
      const required = tabPermissions[tab];
      if (required && required.length > 0 && required.some((p) => userPermissions.has(p))) {
        return tab;
      }
    }
    return 'overview';
  };

  const nextTab = firstAccessibleTab();
  const hasAnyAccess = isOwner || hasTabAccess(nextTab);
  const resolvedTab = hasTabAccess(activeTab) ? activeTab : nextTab;

  const handleTabChange = (tab: string) => {
    const target = hasTabAccess(tab) ? tab : (isOwner ? tab : nextTab);
    setActiveTab(target);
    router.push(tabToPath(target));
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!hasAnyAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">No Access</h1>
          <p className="text-muted-foreground">Your account has no permissions assigned. Contact your household admin to grant you access.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (resolvedTab) {
      case 'overview':
        return <DashboardOverview userId={userId} onNavigate={handleTabChange} />;
      case 'expenses':
        return <ExpenseTracker userId={userId} />;
      case 'income':
        return <IncomeTracker userId={userId} />;
      case 'budgets':
        return <BudgetManager userId={userId} />;
      case 'goals':
        return <FinancialGoals userId={userId} />;
      case 'analytics':
        return <Analytics userId={userId} />;
      case 'categories':
        return <CategoriesPanel userId={userId} />;
      case 'reports':
        return <ReportsPanel userId={userId} />;
      case 'alerts':
        return <AlertsPanel userId={userId} />;
      case 'settings':
        return <SettingsPanel userId={userId} />;
      case 'users':
        return <UsersPanel userId={userId} />;
      case 'roles':
        return <RolesPanel userId={userId} />;
      default:
        return <DashboardOverview userId={userId} onNavigate={handleTabChange} />;
    }
  };

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_34%),var(--background)] flex flex-col">
      <Navigation onTabChange={handleTabChange} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={resolvedTab}
          onTabChange={handleTabChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Mobile Menu Button */}
          <div className="md:hidden sticky top-0 z-20 bg-card border-b border-border p-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-foreground h-8 w-8"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-bold text-foreground">Dashboard</h1>
          </div>

          {/* Page Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
              <CurrencyProvider userId={userId}>
                <div className="space-y-3">
                  {renderContent()}
                </div>
              </CurrencyProvider>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
