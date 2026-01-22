import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  FileText,
  Link as LinkIcon,
  DollarSign,
  User,
  Wallet,
  Shield,
  Menu,
  LogOut,
  TestTube,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  children?: NavItem[];
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { settings } = useGatewaySettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(
    location.pathname.includes('/payin') || location.pathname.includes('/payout')
  );

  const isAdmin = user?.role === 'admin';

  const adminNavItems: NavItem[] = [
    { label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, href: '/admin' },
    { label: t('sidebar.merchants'), icon: <Users className="h-5 w-5" />, href: '/admin/merchants' },
    { label: t('sidebar.payinOrders'), icon: <ArrowDownToLine className="h-5 w-5" />, href: '/admin/payin' },
    { label: t('sidebar.payoutOrders'), icon: <ArrowUpFromLine className="h-5 w-5" />, href: '/admin/payout' },
    { label: t('sidebar.withdrawals'), icon: <Wallet className="h-5 w-5" />, href: '/admin/withdrawals' },
    { label: t('sidebar.apiTesting'), icon: <TestTube className="h-5 w-5" />, href: '/admin/api-testing' },
    { label: t('sidebar.settings'), icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
  ];

  const merchantNavItems: NavItem[] = [
    { label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, href: '/merchant' },
    { label: t('sidebar.analytics'), icon: <BarChart3 className="h-5 w-5" />, href: '/merchant/analytics' },
    { 
      label: t('sidebar.orders') || '订单管理',
      icon: <ClipboardList className="h-5 w-5" />,
      children: [
        { label: t('sidebar.payinOrders'), icon: <ArrowDownToLine className="h-4 w-4" />, href: '/merchant/payin' },
        { label: t('sidebar.payoutOrders'), icon: <ArrowUpFromLine className="h-4 w-4" />, href: '/merchant/payout' },
      ]
    },
    { label: t('sidebar.documentation'), icon: <FileText className="h-5 w-5" />, href: '/merchant/documentation' },
    { label: t('sidebar.apiTesting'), icon: <TestTube className="h-5 w-5" />, href: '/merchant/api-testing' },
    { label: t('sidebar.paymentLinks'), icon: <LinkIcon className="h-5 w-5" />, href: '/merchant/payment-links' },
    { label: t('sidebar.channelPrice'), icon: <DollarSign className="h-5 w-5" />, href: '/merchant/channel-price' },
    { label: t('sidebar.accountInfo'), icon: <User className="h-5 w-5" />, href: '/merchant/info' },
    { label: t('sidebar.withdrawal'), icon: <Wallet className="h-5 w-5" />, href: '/merchant/withdrawal' },
    { label: t('sidebar.settlementHistory') || '结算记录', icon: <History className="h-5 w-5" />, href: '/merchant/settlement-history' },
    { label: t('sidebar.security'), icon: <Shield className="h-5 w-5" />, href: '/merchant/security' },
  ];

  const navItems = isAdmin ? adminNavItems : merchantNavItems;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    if (item.children) {
      return (
        <Collapsible key={item.label} open={ordersOpen} onOpenChange={setOrdersOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors w-full text-left',
                'hover:bg-muted',
                ordersOpen && 'bg-muted/50'
              )}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {ordersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
              {item.children.map((child) => (
                <li key={child.href}>
                  <Link
                    to={child.href!}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm',
                      location.pathname === child.href
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {child.icon}
                    {!collapsed && <span>{child.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <li key={item.href}>
        <Link
          to={item.href!}
          onClick={() => setIsMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
            location.pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          {item.icon}
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <nav className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        {settings.logoUrl && (
          <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 object-contain" />
        )}
        {!collapsed && (
          <span className="font-bold text-lg">{settings.gatewayName}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => renderNavItem(item, collapsed))}
        </ul>
      </div>
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>{t('auth.logout')}</span>}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r bg-card transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <NavContent />
              </SheetContent>
            </Sheet>

            {/* Desktop Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 lg:hidden">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
              )}
              <span className="font-bold">{settings.gatewayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
