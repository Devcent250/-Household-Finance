'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardOverview from '@/components/dashboard/overview';
import ExpenseTracker from '@/components/dashboard/expense-tracker';
import BudgetManager from '@/components/dashboard/budget-manager';
import IncomeTracker from '@/components/dashboard/income-tracker';
import FinancialGoals from '@/components/dashboard/financial-goals';
import Analytics from '@/components/dashboard/analytics';
import CategoriesPanel from '@/components/dashboard/categories-panel';
import ReportsPanel from '@/components/dashboard/reports-panel';
import AlertsPanel from '@/components/dashboard/alerts-panel';
import SettingsPanel from '@/components/dashboard/settings-panel';
import UsersPanel from '@/components/dashboard/users-panel';
import RolesPanel from '@/components/dashboard/roles-panel';
import Navigation from '@/components/navigation';
import Sidebar from '@/components/sidebar';
import { CurrencyProvider } from '@/components/currency-provider';

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

  useEffect(() => {
    // Get user ID from localStorage
    const storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      router.push('/');
      return;
    }
    setUserId(storedUserId);
  }, [router]);

  useEffect(() => {
    setActiveTab(getTabFromPath(pathname));
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(tabToPath(tab));
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

  const renderContent = () => {
    switch (activeTab) {
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
        return <RolesPanel />;
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
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Mobile Menu Button */}
          <div className="md:hidden sticky top-0 z-20 bg-card border-b border-border p-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-foreground"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
          </div>

          {/* Page Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
              <CurrencyProvider userId={userId}>
                <div className="space-y-6">
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
