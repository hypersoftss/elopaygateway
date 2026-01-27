import { useState, useEffect } from 'react';
import { Send, Eye, EyeOff, MessageSquare, Terminal, Users, Shield, Info, Play, AlertCircle, CheckCircle2, Loader2, Bot, Zap, BarChart3, Lock, Bell, TrendingUp, Clock, Search, RefreshCcw, Snowflake, Flame, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Command categories for better organization
const adminCommandCategories = [
  {
    id: 'general',
    icon: '🎯',
    title: 'General & Setup',
    color: 'blue',
    commands: [
      { cmd: '/help', desc: 'Show all available commands with categories', result: 'Interactive help menu with buttons' },
      { cmd: '/tg_id', desc: 'Get current chat/group ID', result: '🆔 Chat ID: -1001234567890' },
      { cmd: '/setmenu', desc: 'Setup command menu for all groups', result: '✅ Bot Menu Updated!' },
      { cmd: '/dashboard', desc: 'Interactive dashboard with quick actions', result: 'Dashboard with clickable buttons' },
    ]
  },
  {
    id: 'merchants',
    icon: '👤',
    title: 'Merchant Management',
    color: 'amber',
    commands: [
      { cmd: '/create_merchant "Name" email group_id gateway_code', desc: 'Create new merchant', result: '✅ Merchant Created!' },
      { cmd: '/merchants', desc: 'List all merchants with buttons', result: '📋 Interactive merchant list' },
      { cmd: '/merchant [account_no]', desc: 'View merchant details', result: '👤 Full merchant info' },
      { cmd: '/search [name]', desc: 'Search merchant by name', result: '🔍 Search results' },
      { cmd: '/toggle [account_no]', desc: 'Enable/Disable merchant', result: '✅ Merchant status toggled' },
    ]
  },
  {
    id: 'balance',
    icon: '💰',
    title: 'Balance & Finance',
    color: 'green',
    commands: [
      { cmd: '/balance [account_no]', desc: 'Check merchant balance', result: '💰 Available: ₹10,000 | Frozen: ₹500' },
      { cmd: '/add_balance [account_no] [amount]', desc: 'Add balance to merchant', result: '✅ ₹5,000 added. New balance: ₹15,000' },
      { cmd: '/set_fee [account_no] [payin] [payout]', desc: 'Set merchant fees', result: '✅ Fees updated: Payin 2%, Payout 1.5%' },
      { cmd: '/freeze [account_no]', desc: 'Freeze merchant account', result: '❄️ Account frozen successfully' },
      { cmd: '/unfreeze [account_no]', desc: 'Unfreeze merchant account', result: '🔥 Account unfrozen successfully' },
    ]
  },
  {
    id: 'transactions',
    icon: '📊',
    title: 'Transactions & Orders',
    color: 'purple',
    commands: [
      { cmd: '/pending', desc: 'View all pending transactions', result: '⏳ System-wide pending orders' },
      { cmd: '/history [account_no] [type]', desc: 'Transaction history (payin/payout)', result: '📋 Last 10 transactions' },
      { cmd: '/status [order_no]', desc: 'Check specific order status', result: '🔍 Order details' },
      { cmd: '/today [account_no]', desc: "Today's summary for merchant", result: "📊 Today's statistics" },
      { cmd: '/large', desc: 'Recent large transactions', result: '🔔 High-value transactions list' },
    ]
  },
  {
    id: 'analytics',
    icon: '📈',
    title: 'Analytics & Reports',
    color: 'cyan',
    commands: [
      { cmd: '/stats', desc: 'System-wide statistics', result: '📊 Complete system overview' },
      { cmd: '/top', desc: 'Top merchants by balance', result: '🏆 Top 10 merchants' },
      { cmd: '/weekly', desc: 'Weekly performance report', result: '📈 7-day analytics' },
      { cmd: '/monthly', desc: 'Monthly performance report', result: '📊 30-day analytics' },
      { cmd: '/comparison', desc: 'Compare today vs yesterday, week vs week', result: '📊 Trend comparison with percentages' },
      { cmd: '/peaks', desc: 'Peak hours analysis', result: '⏰ Hourly transaction distribution' },
      { cmd: '/suspicious', desc: 'Check for suspicious activity', result: '🔍 Anomaly detection results' },
      { cmd: '/alerts', desc: 'Low balance & system alerts', result: '⚠️ Active alerts list' },
    ]
  },
  {
    id: 'security',
    icon: '🔐',
    title: 'Security & Reset',
    color: 'red',
    commands: [
      { cmd: '/reset_2fa [account_no]', desc: "Reset merchant's 2FA", result: '✅ 2FA reset successfully' },
      { cmd: '/reset_password [account_no]', desc: 'Reset login password', result: '✅ New password generated' },
      { cmd: '/reset_withdrawal [account_no]', desc: 'Reset withdrawal password', result: '✅ New withdrawal password' },
      { cmd: '/set_telegram [account_no] [group_id]', desc: 'Link merchant to group', result: '✅ Group linked' },
    ]
  },
];

const merchantCommandCategories = [
  {
    id: 'account',
    icon: '👤',
    title: 'Account Info',
    color: 'blue',
    commands: [
      { cmd: '/me', desc: 'View your account details', result: '👤 Full account info with gateway' },
      { cmd: '/mybalance', desc: 'Quick balance check', result: '💰 Available: ₹10,000 | Frozen: ₹500' },
      { cmd: '/fees', desc: 'View your fee structure', result: '💸 Payin: 2% | Payout: 1.5%' },
    ]
  },
  {
    id: 'transactions',
    icon: '💸',
    title: 'Transactions',
    color: 'green',
    commands: [
      { cmd: '/today', desc: "Today's & yesterday's summary", result: '📊 Complete daily report' },
      { cmd: '/pending', desc: 'Your pending transactions', result: '⏳ Pending orders list' },
      { cmd: '/history [type]', desc: 'Recent transactions (payin/payout)', result: '📋 Transaction history' },
      { cmd: '/status [order_no]', desc: 'Check order status', result: '🔍 Order details' },
    ]
  },
  {
    id: 'analytics',
    icon: '📊',
    title: 'Analytics',
    color: 'purple',
    commands: [
      { cmd: '/weekly', desc: 'Weekly performance stats', result: '📈 7-day analytics' },
      { cmd: '/peaks', desc: 'Your peak transaction hours', result: '⏰ Hourly distribution' },
    ]
  },
  {
    id: 'utility',
    icon: '⚙️',
    title: 'Utility',
    color: 'gray',
    commands: [
      { cmd: '/tg_id', desc: "Get this group's ID", result: '🆔 Chat ID: -1001234567890' },
      { cmd: '/help', desc: 'Show available commands', result: '📋 Help menu' },
    ]
  },
];

// Telegram Bot Tester Component
const TelegramBotTester = ({ botToken }: { botToken: string | null }) => {
  const { language } = useTranslation();
  const { toast } = useToast();
  const [testChatId, setTestChatId] = useState('');
  const [testCommand, setTestCommand] = useState('/help');
  const [testResponse, setTestResponse] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testHistory, setTestHistory] = useState<{ command: string; response: string; status: 'success' | 'error'; time: string }[]>([]);

  const quickCommands = [
    { cmd: '/help', icon: '❓' },
    { cmd: '/tg_id', icon: '🆔' },
    { cmd: '/merchants', icon: '👥' },
    { cmd: '/stats', icon: '📊' },
    { cmd: '/pending', icon: '⏳' },
    { cmd: '/top', icon: '🏆' },
    { cmd: '/weekly', icon: '📈' },
    { cmd: '/comparison', icon: '📊' },
    { cmd: '/dashboard', icon: '🎛️' },
    { cmd: '/setmenu', icon: '📋' },
  ];

  const handleTest = async () => {
    if (!botToken) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请先配置 Bot Token' : 'Please configure Bot Token first',
        variant: 'destructive',
      });
      return;
    }

    if (!testChatId) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请输入 Chat ID' : 'Please enter Chat ID',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResponse('');

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-bot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            message: {
              chat: { id: parseInt(testChatId), type: 'group' },
              text: testCommand,
              from: { id: 0, first_name: 'Admin Test' }
            }
          }),
        }
      );

      const result = await response.json();
      
      const resultStr = JSON.stringify(result, null, 2);
      setTestResponse(resultStr);
      
      const historyItem = {
        command: testCommand,
        response: result.ok ? 'Command executed successfully' : (result.error || 'Unknown error'),
        status: (result.ok ? 'success' : 'error') as 'success' | 'error',
        time: new Date().toLocaleTimeString(),
      };
      
      setTestHistory(prev => [historyItem, ...prev].slice(0, 10));

      toast({
        title: result.ok ? (language === 'zh' ? '成功' : 'Success') : (language === 'zh' ? '错误' : 'Error'),
        description: result.ok 
          ? (language === 'zh' ? '命令已执行' : 'Command executed') 
          : (result.error || 'Failed'),
        variant: result.ok ? 'default' : 'destructive',
      });
    } catch (err: any) {
      setTestResponse(`Error: ${err.message}`);
      setTestHistory(prev => [{
        command: testCommand,
        response: err.message,
        status: 'error' as 'success' | 'error',
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 10));
      
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleGetBotInfo = async () => {
    if (!botToken) return;
    setIsTesting(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      setTestResponse(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestResponse(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleGetUpdates = async () => {
    if (!botToken) return;
    setIsTesting(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      setTestResponse(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setTestResponse(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Test Panel */}
      <Card className="border-border">
        <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Play className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">{language === 'zh' ? '命令测试' : 'Command Tester'}</CardTitle>
              <CardDescription>{language === 'zh' ? '模拟发送命令到 Bot' : 'Simulate sending commands to Bot'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Chat ID Input */}
          <div className="space-y-2">
            <Label>{language === 'zh' ? '目标 Chat ID' : 'Target Chat ID'}</Label>
            <Input
              value={testChatId}
              onChange={(e) => setTestChatId(e.target.value)}
              placeholder="-1001234567890"
              className="font-mono"
            />
          </div>

          {/* Command Input */}
          <div className="space-y-2">
            <Label>{language === 'zh' ? '命令' : 'Command'}</Label>
            <Input
              value={testCommand}
              onChange={(e) => setTestCommand(e.target.value)}
              placeholder="/help"
              className="font-mono"
            />
          </div>

          {/* Quick Commands */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{language === 'zh' ? '快捷命令' : 'Quick Commands'}</Label>
            <div className="flex flex-wrap gap-2">
              {quickCommands.map((qc) => (
                <Button
                  key={qc.cmd}
                  variant="outline"
                  size="sm"
                  onClick={() => setTestCommand(qc.cmd)}
                  className="text-xs font-mono gap-1"
                >
                  <span>{qc.icon}</span>
                  {qc.cmd}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={isTesting} className="flex-1">
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {language === 'zh' ? '执行命令' : 'Execute'}
            </Button>
            <Button variant="outline" onClick={handleGetBotInfo} disabled={isTesting}>
              Bot Info
            </Button>
            <Button variant="outline" onClick={handleGetUpdates} disabled={isTesting}>
              Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Panel */}
      <Card className="border-border">
        <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Terminal className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-base">{language === 'zh' ? '响应输出' : 'Response Output'}</CardTitle>
              <CardDescription>{language === 'zh' ? 'Bot 返回的结果' : 'Results from Bot'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>{language === 'zh' ? '响应' : 'Response'}</Label>
            <Textarea
              value={testResponse}
              readOnly
              className="font-mono text-xs h-40 bg-muted/50"
              placeholder={language === 'zh' ? '响应将显示在这里...' : 'Response will appear here...'}
            />
          </div>

          {testHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{language === 'zh' ? '历史记录' : 'History'}</Label>
              <ScrollArea className="h-32 rounded-md border">
                <div className="p-2 space-y-2">
                  {testHistory.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                      {item.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                      )}
                      <code className="text-primary">{item.command}</code>
                      <span className="text-muted-foreground">-</span>
                      <span className="truncate flex-1">{item.response}</span>
                      <span className="text-muted-foreground shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Command Card Component
const CommandCard = ({ category }: { category: typeof adminCommandCategories[0] }) => {
  const colorClasses: Record<string, { bg: string; border: string; icon: string }> = {
    blue: { bg: 'from-blue-500/10', border: 'border-blue-500/20', icon: 'bg-blue-500/20 text-blue-500' },
    amber: { bg: 'from-amber-500/10', border: 'border-amber-500/20', icon: 'bg-amber-500/20 text-amber-500' },
    green: { bg: 'from-green-500/10', border: 'border-green-500/20', icon: 'bg-green-500/20 text-green-500' },
    purple: { bg: 'from-purple-500/10', border: 'border-purple-500/20', icon: 'bg-purple-500/20 text-purple-500' },
    cyan: { bg: 'from-cyan-500/10', border: 'border-cyan-500/20', icon: 'bg-cyan-500/20 text-cyan-500' },
    red: { bg: 'from-red-500/10', border: 'border-red-500/20', icon: 'bg-red-500/20 text-red-500' },
    gray: { bg: 'from-gray-500/10', border: 'border-gray-500/20', icon: 'bg-gray-500/20 text-gray-500' },
  };

  const colors = colorClasses[category.color] || colorClasses.blue;

  return (
    <Card className={`border-border ${colors.border}`}>
      <CardHeader className={`bg-gradient-to-r ${colors.bg} to-transparent border-b py-4`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colors.icon}`}>
            <span className="text-lg">{category.icon}</span>
          </div>
          <div>
            <CardTitle className="text-base">{category.title}</CardTitle>
            <CardDescription>{category.commands.length} commands</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {category.commands.map((cmd, idx) => (
            <div key={idx} className="group">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono font-medium">
                      {cmd.cmd}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{cmd.desc}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{cmd.result}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => navigator.clipboard.writeText(cmd.cmd.split(' ')[0])}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Feature Highlight Component
const FeatureHighlight = ({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border">
      <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

interface TelegramSettings {
  telegram_bot_token: string | null;
  telegram_webhook_url: string | null;
  admin_telegram_chat_id: string | null;
}

const AdminTelegram = () => {
  const { language } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [showBotToken, setShowBotToken] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('telegram_bot_token, telegram_webhook_url, admin_telegram_chat_id')
        .limit(1);

      if (data && data.length > 0) {
        setSettings({
          telegram_bot_token: data[0].telegram_bot_token || null,
          telegram_webhook_url: data[0].telegram_webhook_url || null,
          admin_telegram_chat_id: data[0].admin_telegram_chat_id || null,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          telegram_bot_token: settings.telegram_bot_token,
          telegram_webhook_url: settings.telegram_webhook_url,
          admin_telegram_chat_id: settings.admin_telegram_chat_id,
        } as any)
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: language === 'zh' ? '已保存' : 'Saved',
        description: language === 'zh' ? 'Telegram 设置已保存' : 'Telegram settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const setWebhook = async () => {
    const webhookUrl = settings?.telegram_webhook_url || `https://ttywuskboaranphxxgtr.supabase.co/functions/v1/telegram-bot`;
    const botToken = settings?.telegram_bot_token;

    if (!botToken) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请先输入 Bot Token' : 'Please enter Bot Token first',
        variant: 'destructive',
      });
      return;
    }

    setIsSettingWebhook(true);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const result = await response.json();

      if (result.ok) {
        toast({
          title: language === 'zh' ? 'Webhook 设置成功' : 'Webhook Set Successfully',
          description: language === 'zh' ? 'Bot 已连接' : 'Bot is now connected',
        });
      } else {
        throw new Error(result.description || 'Failed to set webhook');
      }
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Bot className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Telegram Bot</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? 'Advanced 管理机器人 with Analytics & Security' : 'Advanced management bot with Analytics & Security'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient-primary">
            <Send className="h-4 w-4 mr-2" />
            {isSaving ? '...' : (language === 'zh' ? '保存设置' : 'Save Settings')}
          </Button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <FeatureHighlight icon={BarChart3} title="Analytics" description="Weekly/Monthly reports" color="purple" />
          <FeatureHighlight icon={TrendingUp} title="Comparison" description="Trend analysis" color="green" />
          <FeatureHighlight icon={Clock} title="Peak Hours" description="Traffic patterns" color="cyan" />
          <FeatureHighlight icon={Bell} title="Alerts" description="Auto notifications" color="amber" />
          <FeatureHighlight icon={Lock} title="Security" description="Freeze/Unfreeze" color="red" />
          <FeatureHighlight icon={Zap} title="Interactive" description="Button menus" color="blue" />
        </div>

        <Tabs defaultValue="commands" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="commands" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Commands</span>
            </TabsTrigger>
            <TabsTrigger value="admin-cmds" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
            <TabsTrigger value="merchant-cmds" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Merchant</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Command Overview */}
          <TabsContent value="commands" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Shield className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold">{adminCommandCategories.reduce((acc, cat) => acc + cat.commands.length, 0)}</p>
                    <p className="text-xs text-muted-foreground">Admin Commands</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{merchantCommandCategories.reduce((acc, cat) => acc + cat.commands.length, 0)}</p>
                    <p className="text-xs text-muted-foreground">Merchant Commands</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-muted-foreground">Analytics Commands</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Lock className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">6</p>
                    <p className="text-xs text-muted-foreground">Security Commands</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Popular Commands Quick Reference */}
            <Card>
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Most Used Commands
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { cmd: '/dashboard', desc: 'Interactive control panel', icon: '🎛️' },
                    { cmd: '/stats', desc: 'Complete system overview', icon: '📊' },
                    { cmd: '/merchants', desc: 'Manage all merchants', icon: '👥' },
                    { cmd: '/weekly', desc: 'Weekly performance report', icon: '📈' },
                    { cmd: '/pending', desc: 'Pending transactions', icon: '⏳' },
                    { cmd: '/comparison', desc: 'Trend comparison', icon: '📊' },
                    { cmd: '/freeze', desc: 'Freeze merchant account', icon: '❄️' },
                    { cmd: '/alerts', desc: 'System alerts', icon: '🔔' },
                    { cmd: '/peaks', desc: 'Peak hours analysis', icon: '⏰' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <span className="text-xl">{item.icon}</span>
                      <div className="flex-1">
                        <code className="text-sm font-mono text-primary">{item.cmd}</code>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Copy className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" onClick={() => navigator.clipboard.writeText(item.cmd)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bot Testing */}
            <TelegramBotTester botToken={settings?.telegram_bot_token} />
          </TabsContent>

          {/* Admin Commands Tab */}
          <TabsContent value="admin-cmds" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {adminCommandCategories.map((category) => (
                <CommandCard key={category.id} category={category} />
              ))}
            </div>
          </TabsContent>

          {/* Merchant Commands Tab */}
          <TabsContent value="merchant-cmds" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {merchantCommandCategories.map((category) => (
                <CommandCard key={category.id} category={category} />
              ))}
            </div>
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            {/* Bot Token Card */}
            <Card className="border-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Bot className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Bot Configuration</CardTitle>
                    <CardDescription>Configure your Telegram Bot Token and Webhook</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Bot Token */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    🤖 Bot Token
                  </Label>
                  <div className="relative">
                    <Input
                      type={showBotToken ? 'text' : 'password'}
                      value={settings?.telegram_bot_token || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, telegram_bot_token: e.target.value || null } : null)}
                      placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      className="bg-muted/50 border-border font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowBotToken(!showBotToken)}
                    >
                      {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get Bot Token from @BotFather on Telegram
                  </p>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    🔗 Webhook URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={settings?.telegram_webhook_url || `https://ttywuskboaranphxxgtr.supabase.co/functions/v1/telegram-bot`}
                      onChange={(e) => setSettings(s => s ? { ...s, telegram_webhook_url: e.target.value || null } : null)}
                      placeholder="https://your-domain.com/functions/v1/telegram-bot"
                      className="bg-muted/50 border-border font-mono flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={setWebhook}
                      disabled={isSettingWebhook || !settings?.telegram_bot_token}
                    >
                      {isSettingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Webhook'}
                    </Button>
                  </div>
                </div>

                {/* Admin Group ID */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    👑 Admin Group ID
                  </Label>
                  <Input
                    value={settings?.admin_telegram_chat_id || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, admin_telegram_chat_id: e.target.value || null } : null)}
                    placeholder="-1001234567890"
                    className="bg-muted/50 border-border font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use /tg_id in your group to get the Group ID
                  </p>
                </div>

                <Separator />

                {/* Setup Steps */}
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <Bot className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-600 dark:text-blue-400">
                    <b>Setup Steps:</b>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>Create a bot with @BotFather and get the Token</li>
                      <li>Paste the Token above and Save</li>
                      <li>Click "Set Webhook" to activate the bot</li>
                      <li>Add the bot to your Admin group</li>
                      <li>Send /tg_id in the group to get Group ID</li>
                      <li>Enter the Group ID above and save</li>
                      <li>Send /setmenu to initialize the command menu</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* New Features Alert */}
                <Alert className="border-green-500/30 bg-green-500/10">
                  <Zap className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    <b>✨ Advanced Features:</b>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li><b>/dashboard</b> - Interactive dashboard with buttons</li>
                      <li><b>/weekly, /monthly</b> - Performance analytics</li>
                      <li><b>/comparison</b> - Trend analysis (today vs yesterday)</li>
                      <li><b>/peaks</b> - Peak hours transaction analysis</li>
                      <li><b>/freeze, /unfreeze</b> - Account security controls</li>
                      <li><b>/alerts</b> - Low balance & suspicious activity alerts</li>
                      <li><b>Large transaction alerts</b> - Auto notifications</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminTelegram;
