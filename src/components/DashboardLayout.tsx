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
  UserCog,
  BookOpen,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitch } from '@/components/LanguageSwitch';
import { AdminNotifications } from '@/components/AdminNotifications';
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
  const { t, language } = useTranslation();
  const { user, logout } = useAuthStore();
  const { settings } = useGatewaySettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [merchantsOpen, setMerchantsOpen] = useState(
    location.pathname.includes('/info') || 
    location.pathname.includes('/channel-price') || 
    location.pathname.includes('/security')
  );
  const [adminOrdersOpen, setAdminOrdersOpen] = useState(
    location.pathname.includes('/admin/payin') || location.pathname.includes('/admin/payout')
  );
  const [ordersOpen, setOrdersOpen] = useState(
    location.pathname.includes('/merchant/payin') || location.pathname.includes('/merchant/payout')
  );
  const [settlementOpen, setSettlementOpen] = useState(
    location.pathname.includes('/withdrawal')
  );
  const [sdkDocsOpen, setSdkDocsOpen] = useState(
    location.pathname.includes('/admin/sdk')
  );

  const isAdmin = user?.role === 'admin';

  const adminNavItems: NavItem[] = [
    { label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, href: '/admin' },
    { label: t('sidebar.merchants'), icon: <Users className="h-5 w-5" />, href: '/admin/merchants' },
    { 
      label: language === 'zh' ? '订单管理' : 'Orders',
      icon: <ClipboardList className="h-5 w-5" />,
      children: [
        { label: t('sidebar.payinOrders'), icon: <ArrowDownToLine className="h-4 w-4" />, href: '/admin/payin' },
        { label: t('sidebar.payoutOrders'), icon: <ArrowUpFromLine className="h-4 w-4" />, href: '/admin/payout' },
      ]
    },
    { label: t('sidebar.withdrawals'), icon: <Wallet className="h-5 w-5" />, href: '/admin/withdrawals' },
    { label: language === 'zh' ? '网关管理' : 'Gateways', icon: <Layers className="h-5 w-5" />, href: '/admin/gateways' },
    { label: language === 'zh' ? 'Telegram Bot' : 'Telegram Bot', icon: <MessageSquare className="h-5 w-5" />, href: '/admin/telegram' },
    { label: t('sidebar.apiTesting'), icon: <TestTube className="h-5 w-5" />, href: '/admin/api-testing' },
    { 
      label: language === 'zh' ? 'SDK文档' : 'SDK Documentation',
      icon: <BookOpen className="h-5 w-5" />,
      children: [
        { label: 'BondPay INR', icon: <FileText className="h-4 w-4" />, href: '/admin/sdk/bondpay-inr' },
        { label: 'LG Pay INR', icon: <FileText className="h-4 w-4" />, href: '/admin/sdk/lgpay-inr' },
        { label: 'LG Pay PKR', icon: <FileText className="h-4 w-4" />, href: '/admin/sdk/lgpay-pkr' },
        { label: 'LG Pay BDT', icon: <FileText className="h-4 w-4" />, href: '/admin/sdk/lgpay-bdt' },
      ]
    },
    { label: t('sidebar.settings'), icon: <Settings className="h-5 w-5" />, href: '/admin/settings' },
  ];

  const merchantNavItems: NavItem[] = [
    { label: t('sidebar.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, href: '/merchant' },
    { label: t('sidebar.analytics'), icon: <BarChart3 className="h-5 w-5" />, href: '/merchant/analytics' },
    { 
      label: language === 'zh' ? '商户管理' : 'Merchants',
      icon: <Users className="h-5 w-5" />,
      children: [
        { label: language === 'zh' ? '基本信息' : 'Basic Information', icon: <User className="h-4 w-4" />, href: '/merchant/info' },
        { label: t('sidebar.channelPrice'), icon: <DollarSign className="h-4 w-4" />, href: '/merchant/channel-price' },
        { label: language === 'zh' ? '重置密码' : 'Reset Password', icon: <Shield className="h-4 w-4" />, href: '/merchant/security' },
      ]
    },
    { 
      label: language === 'zh' ? '订单管理' : 'Orders',
      icon: <ClipboardList className="h-5 w-5" />,
      children: [
        { label: t('sidebar.payinOrders'), icon: <ArrowDownToLine className="h-4 w-4" />, href: '/merchant/payin' },
        { label: t('sidebar.payoutOrders'), icon: <ArrowUpFromLine className="h-4 w-4" />, href: '/merchant/payout' },
      ]
    },
    { 
      label: language === 'zh' ? '结算管理' : 'Settlement',
      icon: <Wallet className="h-5 w-5" />,
      children: [
        { label: t('sidebar.withdrawal'), icon: <Wallet className="h-4 w-4" />, href: '/merchant/withdrawal' },
        { label: language === 'zh' ? '结算历史' : 'History', icon: <History className="h-4 w-4" />, href: '/merchant/settlement-history' },
      ]
    },
    { label: t('sidebar.paymentLinks'), icon: <LinkIcon className="h-5 w-5" />, href: '/merchant/payment-links' },
    { label: t('sidebar.documentation'), icon: <FileText className="h-5 w-5" />, href: '/merchant/documentation' },
  ];

  const navItems = isAdmin ? adminNavItems : merchantNavItems;

  const handleLogout = async () => {
    await logout();
    // Note: logout function handles the redirect internally based on user role
  };

  const isChildActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => location.pathname === child.href);
    }
    return false;
  };

  const renderNavItem = (item: NavItem, collapsed: boolean) => {
    if (item.children) {
      const isMerchants = item.label.includes('商户') || item.label.includes('Merchants');
      const isAdminOrders = (item.label.includes('订单') || item.label.includes('Orders')) && isAdmin;
      const isMerchantOrders = (item.label.includes('订单') || item.label.includes('Orders')) && !isAdmin;
      const isSettlement = item.label.includes('结算') || item.label.includes('Settlement');
      const isSDK = item.label.includes('SDK');
      const isOpen = isMerchants ? merchantsOpen : 
                     isAdminOrders ? adminOrdersOpen : 
                     isMerchantOrders ? ordersOpen : 
                     isSettlement ? settlementOpen : sdkDocsOpen;
      const setOpen = isMerchants ? setMerchantsOpen : 
                      isAdminOrders ? setAdminOrdersOpen : 
                      isMerchantOrders ? setOrdersOpen : 
                      isSettlement ? setSettlementOpen : setSdkDocsOpen;
      const hasActiveChild = isChildActive(item);

      return (
        <Collapsible key={item.label} open={isOpen || hasActiveChild} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
                'hover:bg-accent/50',
                (isOpen || hasActiveChild) && 'bg-accent/30'
              )}
            >
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-4">
              {item.children.map((child) => (
                <li key={child.href}>
                  <Link
                    to={child.href!}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                      location.pathname === child.href
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
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
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
            location.pathname === item.href
              ? 'bg-primary text-primary-foreground font-medium shadow-sm'
              : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
          )}
        >
          {item.icon}
          {!collapsed && <span className="text-sm">{item.label}</span>}
        </Link>
      </li>
    );
  };

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
        ) : (
          <div className="h-8 w-8 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm">
            {settings.gatewayName?.charAt(0) || 'P'}
          </div>
        )}
        {!collapsed && (
          <div>
            <span className="font-bold text-lg">{settings.gatewayName}</span>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? (language === 'zh' ? '管理后台' : 'Admin Panel') : (language === 'zh' ? '商户中心' : 'Merchant Portal')}
            </p>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => renderNavItem(item, collapsed))}
        </ul>
      </div>
      
      {/* Logout */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="text-sm">{t('auth.logout')}</span>}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <NavContent collapsed={isCollapsed} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
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
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded" />
              ) : (
                <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xs">
                  {settings.gatewayName?.charAt(0) || 'P'}
                </div>
              )}
              <span className="font-bold text-sm">{settings.gatewayName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[150px]">
              {user?.email}
            </span>
            {isAdmin && <AdminNotifications />}
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-background to-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
};
