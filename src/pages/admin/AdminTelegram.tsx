import { useState, useEffect } from 'react';
import { Send, Eye, EyeOff, MessageSquare, Terminal, Users, Wallet, Shield, Info, Play, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
    { cmd: '/help', desc: 'Show help menu' },
    { cmd: '/tg_id', desc: 'Get chat ID' },
    { cmd: '/merchants', desc: 'List merchants (Admin)' },
    { cmd: '/pending', desc: 'Pending transactions' },
    { cmd: '/stats', desc: 'System statistics' },
    { cmd: '/top', desc: 'Top merchants' },
    { cmd: '/setmenu', desc: 'Setup bot menu' },
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
      // Simulate sending message to the bot by calling our edge function
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
            <p className="text-xs text-muted-foreground">
              {language === 'zh' ? '输入要模拟的 Chat ID (Admin 或 Merchant 群组)' : 'Enter Chat ID to simulate (Admin or Merchant group)'}
            </p>
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
                  className="text-xs font-mono"
                >
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
              {language === 'zh' ? 'Bot 信息' : 'Bot Info'}
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
          {/* Response Area */}
          <div className="space-y-2">
            <Label>{language === 'zh' ? '响应' : 'Response'}</Label>
            <Textarea
              value={testResponse}
              readOnly
              className="font-mono text-xs h-40 bg-muted/50"
              placeholder={language === 'zh' ? '响应将显示在这里...' : 'Response will appear here...'}
            />
          </div>

          {/* History */}
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
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Telegram Bot</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '配置和管理您的 Telegram 管理机器人' : 'Configure and manage your Telegram management bot'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient-primary">
            <Send className="h-4 w-4 mr-2" />
            {isSaving ? '...' : (language === 'zh' ? '保存设置' : 'Save Settings')}
          </Button>
        </div>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span>{language === 'zh' ? '配置' : 'Configuration'}</span>
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              <span>{language === 'zh' ? '测试' : 'Testing'}</span>
            </TabsTrigger>
            <TabsTrigger value="commands" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>{language === 'zh' ? '命令指南' : 'Command Guide'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-6">
            {/* Bot Token Card */}
            <Card className="border-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Send className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {language === 'zh' ? 'Bot 配置' : 'Bot Configuration'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '配置您的 Telegram Bot Token 和 Webhook' : 'Configure your Telegram Bot Token and Webhook'}
                    </CardDescription>
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
                    {language === 'zh' ? '从 @BotFather 获取 Bot Token' : 'Get Bot Token from @BotFather on Telegram'}
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
                      {isSettingWebhook ? '...' : (language === 'zh' ? '设置 Webhook' : 'Set Webhook')}
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
                    {language === 'zh' ? '在群组中使用 /tg_id 获取群组 ID' : 'Use /tg_id in your group to get the Group ID'}
                  </p>
                </div>

                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <Send className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-600 dark:text-blue-400">
                    <b>{language === 'zh' ? '设置步骤:' : 'Setup Steps:'}</b>
                    <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                      <li>{language === 'zh' ? '从 @BotFather 创建 Bot 并获取 Token' : 'Create a bot with @BotFather and get the Token'}</li>
                      <li>{language === 'zh' ? '将 Token 粘贴到上方并保存' : 'Paste the Token above and Save'}</li>
                      <li>{language === 'zh' ? '点击"设置 Webhook"激活 Bot' : 'Click "Set Webhook" to activate the bot'}</li>
                      <li>{language === 'zh' ? '将 Bot 添加到您的 Admin 群组' : 'Add the bot to your Admin group'}</li>
                      <li>{language === 'zh' ? '在群组中发送 /tg_id 获取群组 ID' : 'Send /tg_id in the group to get Group ID'}</li>
                      <li>{language === 'zh' ? '将群组 ID 填入上方并保存' : 'Enter the Group ID above and save'}</li>
                      <li>{language === 'zh' ? '发送 /setmenu 初始化命令菜单' : 'Send /setmenu to initialize the command menu'}</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <TelegramBotTester botToken={settings?.telegram_bot_token} />
          </TabsContent>

          {/* Commands Tab */}
          <TabsContent value="commands" className="space-y-6">
            {/* Admin Commands */}
            <Card className="border-border">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Shield className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">👑 Admin Commands</CardTitle>
                    <CardDescription>Commands available in the Admin group</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* General */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">📋 General</Badge>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <CommandExample
                      command="/tg_id"
                      description="Get current chat/group ID"
                      example="/tg_id"
                      result="🆔 Chat ID: -1001234567890"
                    />
                    <CommandExample
                      command="/setmenu"
                      description="Setup command menu for all groups"
                      example="/setmenu"
                      result="✅ Bot Menu Updated!"
                    />
                    <CommandExample
                      command="/help"
                      description="Show all available commands"
                      example="/help"
                      result="Shows complete command reference"
                    />
                  </div>
                </div>

                {/* Merchant Management */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">👤 Merchant Management</Badge>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <CommandExample
                      command='/create_merchant "Name" email group_id gateway_code'
                      description="Create new merchant with gateway"
                      example='/create_merchant "Test Shop" test@email.com -1001234567890 lgpay_inr'
                      result="✅ Merchant Created! Credentials sent to group."
                    />
                    <CommandExample
                      command="/merchants"
                      description="List all merchants"
                      example="/merchants"
                      result="📋 Merchants List (5): 1. ✅ Test Shop..."
                    />
                    <CommandExample
                      command="/merchant [account_no]"
                      description="View merchant details"
                      example="/merchant 100000001"
                      result="👤 Full merchant info with balance, fees, gateway"
                    />
                    <CommandExample
                      command="/search [name]"
                      description="Search merchant by name"
                      example="/search test"
                      result="🔍 Search Results: matching merchants"
                    />
                  </div>
                </div>

                {/* Balance & Transactions */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">💰 Balance & Transactions</Badge>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <CommandExample
                      command="/balance [account_no]"
                      description="Check merchant balance"
                      example="/balance 100000001"
                      result="💰 Available: ₹10,000 | Frozen: ₹500"
                    />
                    <CommandExample
                      command="/pending"
                      description="View all pending transactions"
                      example="/pending"
                      result="⏳ System Pending: 5 payin, 2 payout orders"
                    />
                    <CommandExample
                      command="/history [account_no] [type]"
                      description="Transaction history (optional: payin/payout)"
                      example="/history 100000001 payin"
                      result="📊 Last 10 payin transactions"
                    />
                    <CommandExample
                      command="/status [order_no]"
                      description="Check specific order status"
                      example="/status PAY1234567890"
                      result="🔍 Order details: amount, status, merchant"
                    />
                    <CommandExample
                      command="/today [account_no]"
                      description="Today's summary for merchant"
                      example="/today 100000001"
                      result="📊 Today's payin/payout count and amounts"
                    />
                  </div>
                </div>

                {/* Account Actions */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">🔧 Account Actions</Badge>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <CommandExample
                      command="/reset_2fa [account_no]"
                      description="Reset merchant's 2FA"
                      example="/reset_2fa 100000001"
                      result="✅ 2FA reset. Merchant will setup again on login."
                    />
                    <CommandExample
                      command="/reset_password [account_no]"
                      description="Reset merchant's login password"
                      example="/reset_password 100000001"
                      result="✅ New Password: Abc123XYZ (sent to merchant)"
                    />
                    <CommandExample
                      command="/reset_withdrawal [account_no]"
                      description="Reset merchant's withdrawal password"
                      example="/reset_withdrawal 100000001"
                      result="✅ New Withdrawal Password: ABCD1234"
                    />
                    <CommandExample
                      command="/set_telegram [account_no] [group_id]"
                      description="Link merchant to Telegram group"
                      example="/set_telegram 100000001 -1009876543210"
                      result="✅ Group linked. Merchant will receive notifications."
                    />
                  </div>
                </div>

                {/* Reports */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">📊 Reports</Badge>
                  </h4>
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    <CommandExample
                      command="/stats"
                      description="System-wide statistics"
                      example="/stats"
                      result="📊 Total merchants, balances, today's volume"
                    />
                    <CommandExample
                      command="/top"
                      description="Top merchants by balance"
                      example="/top"
                      result="🏆 Top 10 merchants ranked by balance"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Merchant Commands */}
            <Card className="border-border">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-transparent border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">🏪 Merchant Commands</CardTitle>
                    <CardDescription>Commands available in Merchant groups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3 pl-4 border-l-2 border-green-500/30">
                  <CommandExample
                    command="/me"
                    description="View your account info"
                    example="/me"
                    result="👤 Account details, balance, fees, gateway info"
                  />
                  <CommandExample
                    command="/mybalance"
                    description="Quick balance check"
                    example="/mybalance"
                    result="💰 Available: ₹10,000 | Frozen: ₹500"
                  />
                  <CommandExample
                    command="/today"
                    description="Today's & yesterday's summary"
                    example="/today"
                    result="📊 Payin/Payout counts, amounts, success rates"
                  />
                  <CommandExample
                    command="/pending"
                    description="Your pending transactions"
                    example="/pending"
                    result="⏳ List of your pending orders"
                  />
                  <CommandExample
                    command="/history [type]"
                    description="Recent transactions (optional: payin/payout)"
                    example="/history payout"
                    result="📋 Last 10 payout transactions"
                  />
                  <CommandExample
                    command="/status [order_no]"
                    description="Check your order status"
                    example="/status PAY1234567890"
                    result="🔍 Order status with full details"
                  />
                  <CommandExample
                    command="/tg_id"
                    description="Get this group's ID"
                    example="/tg_id"
                    result="🆔 Chat ID: -1001234567890"
                  />
                  <CommandExample
                    command="/help"
                    description="Show available commands"
                    example="/help"
                    result="📋 List of all merchant commands"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Command Example Component
const CommandExample = ({ command, description, example, result }: { command: string; description: string; example: string; result: string }) => (
  <div className="space-y-1">
    <div className="flex flex-wrap items-center gap-2">
      <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono">{command}</code>
      <span className="text-sm text-muted-foreground">{description}</span>
    </div>
    <div className="text-xs text-muted-foreground pl-2 border-l border-muted-foreground/30 space-y-1">
      <p><span className="text-foreground/70">Example:</span> <code className="text-blue-500">{example}</code></p>
      <p><span className="text-foreground/70">Result:</span> <span className="text-green-500">{result}</span></p>
    </div>
  </div>
);

export default AdminTelegram;