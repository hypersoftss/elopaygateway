import { useState, useEffect } from 'react';
import { Save, Settings, Percent, Eye, EyeOff, Upload, AlertTriangle, Globe, Mail, Image, Bell, Shield, Smartphone, Check, X, QrCode, Loader2, CheckCircle2, XCircle, Database, Download, Server, Copy, Terminal, FileCode, ExternalLink, Wifi, Lock, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/auth';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AdminSettings {
  id: string;
  default_payin_fee: number;
  default_payout_fee: number;
  gateway_name: string;
  gateway_domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string | null;
  large_payin_threshold: number;
  large_payout_threshold: number;
  large_withdrawal_threshold: number;
  admin_telegram_chat_id: string | null;
  telegram_bot_token: string | null;
  telegram_webhook_url: string | null;
  balance_threshold_inr: number;
  balance_threshold_pkr: number;
  balance_threshold_bdt: number;
  no_auto_delete_commands: string | null;
  usdt_conversion_rate: number;
}


const AdminSettingsPage = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // 2FA State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Domain test state
  const [isTestingDomain, setIsTestingDomain] = useState(false);
  const [domainTestResult, setDomainTestResult] = useState<'success' | 'error' | null>(null);
  
  // Database export/restore state
  const [isExporting, setIsExporting] = useState(false);
  const [sqlFileContent, setSqlFileContent] = useState<string | null>(null);
  const [sqlFileName, setSqlFileName] = useState<string>('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  
  // Domain checker state
  const [domainToCheck, setDomainToCheck] = useState('');
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainCheckResults, setDomainCheckResults] = useState<{
    dns: { status: 'success' | 'error' | 'pending'; message: string } | null;
    ssl: { status: 'success' | 'error' | 'pending'; message: string } | null;
    http: { status: 'success' | 'error' | 'pending'; message: string } | null;
  } | null>(null);
  
  // Deploy script state
  const [deployScriptDomain, setDeployScriptDomain] = useState('');
  const [deployScriptGithubUrl, setDeployScriptGithubUrl] = useState('');
  const [showDeployScript, setShowDeployScript] = useState(false);

  // Test gateway domain connectivity
  const testDomainConnection = async () => {
    const domain = settings?.gateway_domain?.replace(/\/+$/, '');
    if (!domain) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请先输入域名' : 'Please enter a domain first',
        variant: 'destructive',
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(domain);
    } catch {
      toast({
        title: language === 'zh' ? '无效URL' : 'Invalid URL',
        description: language === 'zh' ? '请输入有效的URL格式' : 'Please enter a valid URL format',
        variant: 'destructive',
      });
      setDomainTestResult('error');
      return;
    }

    setIsTestingDomain(true);
    setDomainTestResult(null);

    try {
      // Try to fetch the domain with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(domain, {
        method: 'HEAD',
        mode: 'no-cors', // Allow cross-origin requests without CORS
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // no-cors mode always returns opaque response, but if it doesn't throw, the domain is reachable
      setDomainTestResult('success');
      toast({
        title: language === 'zh' ? '连接成功' : 'Connection Successful',
        description: language === 'zh' ? `${domain} 可访问` : `${domain} is reachable`,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: language === 'zh' ? '连接超时' : 'Connection Timeout',
          description: language === 'zh' ? '域名响应时间过长' : 'Domain took too long to respond',
          variant: 'destructive',
        });
      } else {
        toast({
          title: language === 'zh' ? '连接失败' : 'Connection Failed',
          description: language === 'zh' ? '无法访问该域名' : 'Could not reach the domain',
          variant: 'destructive',
        });
      }
      setDomainTestResult('error');
    } finally {
      setIsTestingDomain(false);
    }
  };

  // Domain validation function
  const checkDomainConfiguration = async () => {
    if (!domainToCheck) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: language === 'zh' ? '请输入域名' : 'Please enter a domain',
        variant: 'destructive',
      });
      return;
    }

    let cleanDomain = domainToCheck.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    setIsCheckingDomain(true);
    setDomainCheckResults({
      dns: { status: 'pending', message: language === 'zh' ? '检查中...' : 'Checking...' },
      ssl: { status: 'pending', message: language === 'zh' ? '检查中...' : 'Checking...' },
      http: { status: 'pending', message: language === 'zh' ? '检查中...' : 'Checking...' },
    });

    // Check DNS using public DNS API
    try {
      const dnsResponse = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=A`);
      const dnsData = await dnsResponse.json();
      
      if (dnsData.Answer && dnsData.Answer.length > 0) {
        const ips = dnsData.Answer.filter((a: any) => a.type === 1).map((a: any) => a.data);
        setDomainCheckResults(prev => prev ? {
          ...prev,
          dns: { 
            status: 'success', 
            message: `${language === 'zh' ? 'A记录' : 'A Records'}: ${ips.join(', ')}` 
          }
        } : null);
      } else {
        setDomainCheckResults(prev => prev ? {
          ...prev,
          dns: { 
            status: 'error', 
            message: language === 'zh' ? '未找到A记录' : 'No A records found' 
          }
        } : null);
      }
    } catch {
      setDomainCheckResults(prev => prev ? {
        ...prev,
        dns: { 
          status: 'error', 
          message: language === 'zh' ? 'DNS查询失败' : 'DNS lookup failed' 
        }
      } : null);
    }

    // Check HTTP/HTTPS connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      await fetch(`https://${cleanDomain}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      setDomainCheckResults(prev => prev ? {
        ...prev,
        http: { 
          status: 'success', 
          message: language === 'zh' ? 'HTTPS可访问' : 'HTTPS accessible' 
        },
        ssl: { 
          status: 'success', 
          message: language === 'zh' ? 'SSL证书有效' : 'SSL certificate valid' 
        }
      } : null);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setDomainCheckResults(prev => prev ? {
          ...prev,
          http: { 
            status: 'error', 
            message: language === 'zh' ? '连接超时' : 'Connection timeout' 
          },
          ssl: { 
            status: 'error', 
            message: language === 'zh' ? '无法验证' : 'Cannot verify' 
          }
        } : null);
      } else {
        // Try HTTP fallback
        try {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
          
          await fetch(`http://${cleanDomain}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller2.signal,
          });
          
          clearTimeout(timeoutId2);
          
          setDomainCheckResults(prev => prev ? {
            ...prev,
            http: { 
              status: 'success', 
              message: language === 'zh' ? 'HTTP可访问 (无SSL)' : 'HTTP accessible (no SSL)' 
            },
            ssl: { 
              status: 'error', 
              message: language === 'zh' ? '未配置SSL' : 'SSL not configured' 
            }
          } : null);
        } catch {
          setDomainCheckResults(prev => prev ? {
            ...prev,
            http: { 
              status: 'error', 
              message: language === 'zh' ? '无法访问' : 'Not accessible' 
            },
            ssl: { 
              status: 'error', 
              message: language === 'zh' ? '无法验证' : 'Cannot verify' 
            }
          } : null);
        }
      }
    }

    setIsCheckingDomain(false);
  };

  // Generate deployment script
  const generateDeployScript = () => {
    const projectId = 'YOUR_SUPABASE_PROJECT_ID';
    const domain = deployScriptDomain || 'your-domain.com';
    const githubUrl = deployScriptGithubUrl || 'YOUR_GITHUB_REPO_URL';
    const folderName = githubUrl.split('/').pop()?.replace('.git', '') || 'gateway';
    
    return `#!/bin/bash
# ===============================================
# ELOPAY GATEWAY - AUTO DEPLOY SCRIPT
# Generated: ${new Date().toISOString()}
# ===============================================

set -e

echo "🚀 Starting Gateway Deployment..."

# ==================== VARIABLES ====================
DOMAIN="${domain}"
GITHUB_URL="${githubUrl}"
PROJECT_FOLDER="${folderName}"
SUPABASE_PROJECT_ID="${projectId}"
WEB_ROOT="/var/www/gateway"

# ==================== PREREQUISITES ====================
echo "📦 Installing prerequisites..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx nodejs npm git certbot python3-certbot-nginx

# Install Node.js 18+ if needed
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

npm install -g pm2 supabase

# ==================== CLONE & BUILD ====================
echo "📥 Cloning repository..."
cd /home
rm -rf \${PROJECT_FOLDER}
git clone \${GITHUB_URL}
cd \${PROJECT_FOLDER}

echo "⚙️ Creating .env file..."
cat > .env << EOF
VITE_SUPABASE_URL=https://\${SUPABASE_PROJECT_ID}.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY_HERE
VITE_SUPABASE_PROJECT_ID=\${SUPABASE_PROJECT_ID}
EOF

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

# ==================== DEPLOY FILES ====================
echo "📂 Deploying to web root..."
sudo mkdir -p \${WEB_ROOT}
sudo rm -rf \${WEB_ROOT}/*
sudo cp -r dist/* \${WEB_ROOT}/
sudo chown -R www-data:www-data \${WEB_ROOT}

# ==================== NGINX CONFIG ====================
echo "⚡ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/gateway > /dev/null << 'NGINX'
server {
    listen 80;
    server_name ${domain};
    root /var/www/gateway;
    index index.html;

    location / {
        try_files \\$uri \\$uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# ==================== SSL CERTIFICATE ====================
echo "🔒 Installing SSL certificate..."
sudo certbot --nginx -d \${DOMAIN} --non-interactive --agree-tos --email admin@\${DOMAIN} || true

# ==================== EDGE FUNCTIONS ====================
echo "☁️ Note: Deploy edge functions manually:"
echo "   supabase login"
echo "   supabase link --project-ref \${SUPABASE_PROJECT_ID}"
echo "   supabase functions deploy"

# ==================== COMPLETE ====================
echo ""
echo "✅ =========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "✅ =========================================="
echo ""
echo "🌐 Your gateway is now live at: https://\${DOMAIN}"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with your actual Supabase anon key"
echo "   2. Run SQL backup in Supabase SQL Editor"
echo "   3. Deploy edge functions using supabase CLI"
echo ""
`;
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1);

      if (data && data.length > 0) {
        const settingsData = data[0] as any;
        setSettings({
          ...settingsData,
          large_payin_threshold: settingsData.large_payin_threshold || 10000,
          large_payout_threshold: settingsData.large_payout_threshold || 5000,
          large_withdrawal_threshold: settingsData.large_withdrawal_threshold || 10000,
          favicon_url: settingsData.favicon_url || null,
          admin_telegram_chat_id: settingsData.admin_telegram_chat_id || null,
          telegram_bot_token: settingsData.telegram_bot_token || null,
          telegram_webhook_url: settingsData.telegram_webhook_url || null,
          balance_threshold_inr: settingsData.balance_threshold_inr || 10000,
          balance_threshold_pkr: settingsData.balance_threshold_pkr || 50000,
          balance_threshold_bdt: settingsData.balance_threshold_bdt || 50000,
          no_auto_delete_commands: settingsData.no_auto_delete_commands || '/help,/tg_id,/id,/chatid,/setmenu,/create_merchant,/broadcast',
        } as AdminSettings);
        setLogoPreview(settingsData.logo_url);
        setFaviconPreview(settingsData.favicon_url);
      }

      // Fetch admin 2FA status
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('admin_profiles')
          .select('is_2fa_enabled')
          .eq('user_id', user.id)
          .limit(1);
        
        if (profileData && profileData.length > 0) {
          setIs2FAEnabled(!!profileData[0].is_2fa_enabled);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  // 2FA Functions
  const generateTOTPSecret = () => {
    const gatewayName = settings?.gateway_name || 'PayGate';
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: gatewayName,
      label: 'Admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });
    
    setTotpSecret(secret.base32);
    setTotpUri(totp.toString());
    setShow2FASetup(true);
  };

  const verifyAndEnable2FA = async () => {
    if (!user?.id || verificationCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const gatewayName = settings?.gateway_name || 'PayGate';
      const totp = new OTPAuth.TOTP({
        issuer: gatewayName,
        label: 'Admin',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret),
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 }) !== null;

      if (!isValid) {
        toast({
          title: language === 'zh' ? '验证失败' : 'Verification Failed',
          description: language === 'zh' ? '验证码不正确，请重试' : 'Invalid code, please try again',
          variant: 'destructive',
        });
        return;
      }

      // Save to admin_profiles
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          google_2fa_secret: totpSecret,
          is_2fa_enabled: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIs2FAEnabled(true);
      setShow2FASetup(false);
      setVerificationCode('');
      toast({
        title: language === 'zh' ? '2FA已启用' : '2FA Enabled',
        description: language === 'zh' ? '双重认证已成功启用' : 'Two-factor authentication is now active',
      });
    } catch (error: any) {
      toast({
        title: language === 'zh' ? '错误' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          google_2fa_secret: null,
          is_2fa_enabled: false,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIs2FAEnabled(false);
      toast({
        title: language === 'zh' ? '2FA已禁用' : '2FA Disabled',
        description: language === 'zh' ? '双重认证已关闭' : 'Two-factor authentication has been disabled',
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

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      let logoUrl = settings.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gateway-assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gateway-assets')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      let faviconUrl = settings.favicon_url;
      if (faviconFile) {
        const fileExt = faviconFile.name.split('.').pop();
        const fileName = `favicon-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('gateway-assets')
          .upload(fileName, faviconFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('gateway-assets')
          .getPublicUrl(fileName);

        faviconUrl = urlData.publicUrl;
      }

      // Sanitize gateway domain - remove trailing slashes
      const sanitizedDomain = settings.gateway_domain?.replace(/\/+$/, '') || null;

      const { error } = await supabase
        .from('admin_settings')
        .update({
          default_payin_fee: settings.default_payin_fee,
          default_payout_fee: settings.default_payout_fee,
          gateway_name: settings.gateway_name?.trim() || 'PayGate',
          gateway_domain: sanitizedDomain,
          logo_url: logoUrl,
          favicon_url: faviconUrl,
          support_email: settings.support_email?.trim() || null,
          large_payin_threshold: settings.large_payin_threshold,
          large_payout_threshold: settings.large_payout_threshold,
          large_withdrawal_threshold: settings.large_withdrawal_threshold,
          admin_telegram_chat_id: settings.admin_telegram_chat_id?.trim() || null,
          telegram_bot_token: settings.telegram_bot_token?.trim() || null,
          telegram_webhook_url: settings.telegram_webhook_url?.trim() || null,
          balance_threshold_inr: settings.balance_threshold_inr,
          balance_threshold_pkr: settings.balance_threshold_pkr,
          balance_threshold_bdt: settings.balance_threshold_bdt,
          no_auto_delete_commands: settings.no_auto_delete_commands?.trim() || null,
        } as any)
        .eq('id', settings.id);

      if (error) throw error;

      // Clear the gateway settings cache so new settings are fetched
      const { clearGatewaySettingsCache } = await import('@/hooks/useGatewaySettings');
      clearGatewaySettingsCache();

      toast({
        title: t('common.success'),
        description: language === 'zh' ? '设置已保存' : 'Settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
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
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '配置网关品牌、API凭证和默认费率' : 'Configure your gateway branding, API credentials, and default fees'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="btn-gradient-primary">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.loading') : (language === 'zh' ? '保存所有更改' : 'Save All Changes')}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '品牌' : 'Brand'}</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '费率' : 'Fees'}</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '通知' : 'Alerts'}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'zh' ? '安全' : 'Security'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Gateway Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '网关品牌' : 'Gateway Branding'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '自定义您的支付网关标识' : 'Customize your payment gateway identity'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {language === 'zh' ? '网关Logo' : 'Gateway Logo'}
                  </Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="w-16 h-16 rounded-lg border flex items-center justify-center bg-muted overflow-hidden">
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="logo" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {language === 'zh' ? '上传Logo' : 'Upload Logo'}
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'zh' ? '推荐: 200x200px PNG或SVG, 最大2MB' : 'Recommended: 200x200px PNG or SVG. Max 2MB.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    {language === 'zh' ? '网站图标 (Favicon)' : 'Favicon'}
                  </Label>
                  <div className="flex items-center gap-4">
                    {faviconPreview && (
                      <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-muted overflow-hidden">
                        <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <Input
                        id="favicon"
                        type="file"
                        accept="image/*,.ico"
                        onChange={handleFaviconChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <label htmlFor="favicon" className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {language === 'zh' ? '上传图标' : 'Upload Favicon'}
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'zh' ? '推荐: 32x32px或64x64px PNG/ICO' : 'Recommended: 32x32px or 64x64px PNG/ICO'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {language === 'zh' ? '网关名称' : 'Gateway Name'}
                    </Label>
                    <Input
                      value={settings?.gateway_name || ''}
                      onChange={(e) => setSettings(s => s ? { ...s, gateway_name: e.target.value } : null)}
                      placeholder="PayGate"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '此名称将显示在文档和商户仪表板中' : 'This name will appear in docs and merchant dashboard'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {language === 'zh' ? '网关域名' : 'Gateway Domain'}
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          value={settings?.gateway_domain || ''}
                          onChange={(e) => {
                            // Auto-remove trailing slashes on input and reset test result
                            const value = e.target.value.replace(/\/+$/, '');
                            setSettings(s => s ? { ...s, gateway_domain: value } : null);
                            setDomainTestResult(null);
                          }}
                          placeholder="https://your-gateway.com"
                          className={domainTestResult === 'success' ? 'border-green-500 pr-10' : domainTestResult === 'error' ? 'border-destructive pr-10' : ''}
                        />
                        {domainTestResult && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {domainTestResult === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={testDomainConnection}
                        disabled={isTestingDomain || !settings?.gateway_domain}
                      >
                        {isTestingDomain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          language === 'zh' ? '测试连接' : 'Test'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' ? '您网关的公共URL，用于API文档（无需末尾斜杠）' : "Your gateway's public URL for API documentation (no trailing slash)"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {language === 'zh' ? '客服邮箱' : 'Support Email'}
                  </Label>
                  <Input
                    type="email"
                    value={settings?.support_email || ''}
                    onChange={(e) => setSettings(s => s ? { ...s, support_email: e.target.value } : null)}
                    placeholder="support@your-gateway.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '向商户显示的客服联系邮箱' : 'Contact email shown to merchants for support'}
                  </p>
                </div>

                {/* Preview */}
                <div className="border-t pt-6">
                  <Label className="text-sm text-muted-foreground mb-3 block">{language === 'zh' ? '预览' : 'Preview'}</Label>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain" />
                    )}
                    <div>
                      <p className="font-semibold">{settings?.gateway_name || 'PayGate'}</p>
                      <p className="text-xs text-muted-foreground">{settings?.gateway_domain || 'https://your-gateway.com'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>



          {/* Default Fees Tab */}
          <TabsContent value="fees">
            <Card>
              <CardHeader className="bg-green-500/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Percent className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '默认费率配置' : 'Default Fee Configuration'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '为新商户设置默认费率（可按商户自定义）' : 'Set default fees for new merchants (can be customized per merchant)'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 border-green-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">IN</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? 'Pay-In费率' : 'Pay-In Fee'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '收款时收取' : 'Charged on incoming payments'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '默认Payin费率 (%)' : 'Default Payin Fee (%)'}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings?.default_payin_fee || 0}
                        onChange={(e) => setSettings(s => s ? { ...s, default_payin_fee: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-orange-500/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">OUT</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? 'Pay-Out费率' : 'Pay-Out Fee'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '提现时收取' : 'Charged on withdrawals'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '默认Payout费率 (%)' : 'Default Payout Fee (%)'}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings?.default_payout_fee || 0}
                        onChange={(e) => setSettings(s => s ? { ...s, default_payout_fee: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>
                </div>

                <Alert className="mt-6">
                  <AlertDescription className="text-muted-foreground">
                    💡 {language === 'zh' 
                      ? '这些费率将应用于新商户。您可以在商户编辑页面为各个商户自定义费率。'
                      : "These fees will be applied to new merchants. You can customize fees for individual merchants in their edit page."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Notification Thresholds Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader className="bg-amber-500/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle>{language === 'zh' ? '通知阈值配置' : 'Notification Threshold Configuration'}</CardTitle>
                    <CardDescription>
                      {language === 'zh' ? '设置大额交易通知的触发阈值' : 'Set thresholds for large transaction alerts'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    {language === 'zh' 
                      ? '当交易金额超过设定阈值时，系统将自动发送通知提醒。'
                      : 'When transaction amounts exceed these thresholds, you will receive automatic notifications.'}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-2 border-[hsl(var(--success))]/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[hsl(var(--success))] rounded-lg flex items-center justify-center text-white text-xs font-bold">IN</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额Pay-In' : 'Large Pay-In'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '收款超过此金额通知' : 'Notify when pay-in exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_payin_threshold || 10000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_payin_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="10000"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-[hsl(var(--warning))]/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[hsl(var(--warning))] rounded-lg flex items-center justify-center text-white text-xs font-bold">OUT</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额Pay-Out' : 'Large Pay-Out'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '付款超过此金额通知' : 'Notify when payout exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_payout_threshold || 5000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_payout_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="5000"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-destructive/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-destructive rounded-lg flex items-center justify-center text-white text-xs font-bold">WD</div>
                        <div>
                          <CardTitle className="text-base">{language === 'zh' ? '大额提现' : 'Large Withdrawal'}</CardTitle>
                          <CardDescription className="text-xs">
                            {language === 'zh' ? '提现超过此金额通知' : 'Notify when withdrawal exceeds this amount'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                      <Input
                        type="number"
                        value={settings?.large_withdrawal_threshold || 10000}
                        onChange={(e) => setSettings(s => s ? { ...s, large_withdrawal_threshold: parseFloat(e.target.value) } : null)}
                        className="mt-2"
                        placeholder="10000"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Gateway Balance Thresholds */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    💰 {language === 'zh' ? '网关余额告警阈值' : 'Gateway Balance Alert Thresholds'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'zh' 
                      ? '当网关余额低于设定阈值时，将发送Telegram告警通知' 
                      : 'Telegram alerts will be sent when gateway balance falls below these thresholds'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-2 border-amber-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">INR</div>
                          <div>
                            <CardTitle className="text-base">India (INR)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '印度卢比阈值' : 'Indian Rupee threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (₹)' : 'Threshold (₹)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_inr || 10000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_inr: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="10000"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-green-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">PKR</div>
                          <div>
                            <CardTitle className="text-base">Pakistan (PKR)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '巴基斯坦卢比阈值' : 'Pakistani Rupee threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (Rs.)' : 'Threshold (Rs.)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_pkr || 50000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_pkr: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="50000"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-teal-500/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">BDT</div>
                          <div>
                            <CardTitle className="text-base">Bangladesh (BDT)</CardTitle>
                            <CardDescription className="text-xs">
                              {language === 'zh' ? '孟加拉塔卡阈值' : 'Bangladeshi Taka threshold'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Label>{language === 'zh' ? '阈值 (৳)' : 'Threshold (৳)'}</Label>
                        <Input
                          type="number"
                          value={settings?.balance_threshold_bdt || 50000}
                          onChange={(e) => setSettings(s => s ? { ...s, balance_threshold_bdt: parseFloat(e.target.value) } : null)}
                          className="mt-2"
                          placeholder="50000"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Telegram Bot Auto-Delete Settings */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    🤖 {language === 'zh' ? 'Telegram Bot 消息设置' : 'Telegram Bot Message Settings'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'zh' 
                      ? '这些命令的回复不会被下一条命令自动删除（保留在聊天中）' 
                      : 'Responses to these commands will NOT be auto-deleted by the next command (kept visible in chat)'}
                  </p>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      📝 {language === 'zh' ? '不自动删除的命令' : 'No Auto-Delete Commands'}
                    </Label>
                    <Input
                      value={settings?.no_auto_delete_commands || '/help,/tg_id,/id,/chatid,/setmenu,/create_merchant,/broadcast'}
                      onChange={(e) => setSettings(s => s ? { ...s, no_auto_delete_commands: e.target.value } : null)}
                      placeholder="/help,/tg_id,/id,/chatid,/setmenu,/create_merchant,/broadcast"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'zh' 
                        ? '用逗号分隔命令，例如: /help,/tg_id,/create_merchant' 
                        : 'Comma-separated commands, e.g., /help,/tg_id,/create_merchant'}
                    </p>
                    <Alert>
                      <AlertDescription className="text-muted-foreground">
                        💡 {language === 'zh' 
                          ? '注意：当用户发送任何新命令时，之前的Bot消息都会被删除。只有这些特殊命令的回复会保留。'
                          : 'Note: When a user sends any new command, the previous bot message is always deleted. Only responses to these special commands will be kept visible.'}
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="border-2 border-primary/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {language === 'zh' ? 'Google双重认证 (2FA)' : 'Google Two-Factor Authentication'}
                        {is2FAEnabled ? (
                          <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20">
                            <Check className="h-3 w-3 mr-1" />
                            {language === 'zh' ? '已启用' : 'Enabled'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <X className="h-3 w-3 mr-1" />
                            {language === 'zh' ? '未启用' : 'Disabled'}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {language === 'zh' 
                          ? '使用Google Authenticator添加额外的安全层' 
                          : 'Add an extra layer of security using Google Authenticator'}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {is2FAEnabled ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-[hsl(var(--success))]" />
                      </div>
                      <div>
                        <p className="font-medium">{language === 'zh' ? '2FA已激活' : '2FA is Active'}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'zh' ? '您的账户受到双重认证保护' : 'Your account is protected with 2FA'}
                        </p>
                      </div>
                    </div>
                    <Button variant="destructive" onClick={disable2FA} disabled={isSaving}>
                      {language === 'zh' ? '禁用2FA' : 'Disable 2FA'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <QrCode className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{language === 'zh' ? '启用2FA保护' : 'Enable 2FA Protection'}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'zh' ? '扫描二维码设置Google Authenticator' : 'Scan QR code to setup Google Authenticator'}
                        </p>
                      </div>
                    </div>
                    <Button onClick={generateTOTPSecret} className="btn-gradient-primary">
                      <Smartphone className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '设置2FA' : 'Setup 2FA'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Backup & Restore */}
            <Card className="border-2 border-primary/20 overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'zh' ? '数据库备份与恢复' : 'Database Backup & Restore'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' 
                        ? '导出完整SQL或从备份恢复数据库' 
                        : 'Export complete SQL or restore database from backup'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Export Section */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Download className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{language === 'zh' ? '导出数据库' : 'Export Database'}</p>
                      <p className="text-sm text-muted-foreground">
                        {language === 'zh' ? 'Schema + RLS + Functions + Data' : 'Schema + RLS + Functions + Data'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={async () => {
                      setIsExporting(true);
                      try {
                        const { data: sessionData } = await supabase.auth.getSession();
                        if (!sessionData.session) {
                          throw new Error('Not authenticated');
                        }
                        
                        const response = await supabase.functions.invoke('export-database', {
                          headers: {
                            Authorization: `Bearer ${sessionData.session.access_token}`,
                          },
                        });
                        
                        if (response.error) throw response.error;
                        
                        // Create download
                        const blob = new Blob([response.data], { type: 'application/sql' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `elopay_backup_${new Date().toISOString().split('T')[0]}.sql`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: language === 'zh' ? '导出成功' : 'Export Successful',
                          description: language === 'zh' ? 'SQL备份已下载' : 'SQL backup downloaded',
                        });
                      } catch (err: any) {
                        toast({
                          title: language === 'zh' ? '导出失败' : 'Export Failed',
                          description: err.message,
                          variant: 'destructive',
                        });
                      } finally {
                        setIsExporting(false);
                      }
                    }}
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'zh' ? '导出中...' : 'Exporting...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '下载SQL' : 'Download SQL'}
                      </>
                    )}
                  </Button>
                </div>

                {/* Restore Section */}
                <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{language === 'zh' ? '恢复数据库' : 'Restore Database'}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === 'zh' ? '从SQL备份文件恢复' : 'Restore from SQL backup file'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".sql"
                        className="hidden"
                        id="sql-restore-file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSqlFileName(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setSqlFileContent(event.target?.result as string);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                      <label htmlFor="sql-restore-file">
                        <Button variant="outline" asChild className="cursor-pointer">
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {language === 'zh' ? '选择SQL文件' : 'Select SQL File'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                  
                  {sqlFileContent && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-background rounded border">
                        <FileCode className="h-5 w-5 text-primary" />
                        <span className="font-medium text-sm flex-1">{sqlFileName}</span>
                        <Badge variant="outline">{(sqlFileContent.length / 1024).toFixed(1)} KB</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSqlFileContent(null);
                            setSqlFileName('');
                            const input = document.getElementById('sql-restore-file') as HTMLInputElement;
                            if (input) input.value = '';
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="p-3 bg-background rounded border max-h-40 overflow-auto">
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                          {sqlFileContent.slice(0, 1000)}
                          {sqlFileContent.length > 1000 && '\n... (truncated)'}
                        </pre>
                      </div>
                      
                      <Button 
                        onClick={() => setShowRestoreDialog(true)}
                        variant="destructive"
                        className="w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '开始恢复' : 'Start Restore'}
                      </Button>
                    </div>
                  )}
                </div>
                
                <Alert className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <AlertDescription className="text-sm">
                    {language === 'zh' 
                      ? '导出的SQL包含完整数据库：Enums + Functions + Tables + RLS Policies + Storage + Data。' 
                      : 'Exported SQL contains everything: Enums + Functions + Tables + RLS Policies + Storage + Data.'}
                  </AlertDescription>
                </Alert>
                
                <Alert className="border-orange-500/30 bg-orange-500/5">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="text-sm">
                    {language === 'zh' 
                      ? '⚠️ 恢复前请务必先导出当前数据作为备份！恢复操作会覆盖现有数据。' 
                      : '⚠️ Always export current data as backup before restoring! Restore operation will overwrite existing data.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Restore Confirmation Dialog */}
            <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    {language === 'zh' ? '确认数据库恢复' : 'Confirm Database Restore'}
                  </DialogTitle>
                  <DialogDescription>
                    {language === 'zh' 
                      ? '此操作将覆盖现有数据库数据。此操作不可撤销！'
                      : 'This will overwrite existing database data. This action cannot be undone!'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {language === 'zh' 
                        ? '请输入 "RESTORE" 确认恢复操作'
                        : 'Type "RESTORE" to confirm the restore operation'}
                    </AlertDescription>
                  </Alert>
                  
                  <Input
                    placeholder={language === 'zh' ? '输入 RESTORE 确认' : 'Type RESTORE to confirm'}
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value.toUpperCase())}
                    className="text-center font-mono text-lg"
                  />
                  
                  <div className="text-sm text-muted-foreground text-center">
                    {language === 'zh' 
                      ? `将恢复文件: ${sqlFileName}`
                      : `Will restore from: ${sqlFileName}`}
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowRestoreDialog(false);
                      setRestoreConfirmText('');
                    }}
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={restoreConfirmText !== 'RESTORE' || isRestoring}
                    onClick={async () => {
                      if (!sqlFileContent) return;
                      
                      setIsRestoring(true);
                      try {
                        // Copy SQL to clipboard for manual execution
                        await navigator.clipboard.writeText(sqlFileContent);
                        
                        toast({
                          title: language === 'zh' ? 'SQL已复制' : 'SQL Copied',
                          description: language === 'zh' 
                            ? '请在Supabase SQL编辑器中运行此SQL'
                            : 'Please run this SQL in Supabase SQL Editor',
                        });
                        
                        // Reset state
                        setShowRestoreDialog(false);
                        setRestoreConfirmText('');
                        setSqlFileContent(null);
                        setSqlFileName('');
                        
                        // Open backend for SQL execution
                        toast({
                          title: language === 'zh' ? '下一步' : 'Next Step',
                          description: language === 'zh' 
                            ? '打开后端 SQL Editor 粘贴运行SQL'
                            : 'Open Backend SQL Editor and paste to run SQL',
                        });
                      } catch (err: any) {
                        toast({
                          title: language === 'zh' ? '复制失败' : 'Copy Failed',
                          description: err.message,
                          variant: 'destructive',
                        });
                      } finally {
                        setIsRestoring(false);
                      }
                    }}
                  >
                    {isRestoring ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'zh' ? '处理中...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '复制SQL并恢复' : 'Copy SQL & Restore'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* VPS Deployment Guide */}
            <Card className="border-2 border-primary/20 overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'zh' ? 'VPS部署指南 (Nginx)' : 'VPS Deployment Guide (Nginx)'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' 
                        ? '完整的自托管部署步骤' 
                        : 'Complete self-hosting deployment steps'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Step 1: Prerequisites */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">1</div>
                    <h4 className="font-semibold">{language === 'zh' ? '准备工作' : 'Prerequisites'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <p className="text-muted-foreground mb-2"># {language === 'zh' ? '确保VPS安装以下软件' : 'Make sure VPS has these installed'}</p>
                    <div className="flex items-center justify-between">
                      <code>sudo apt update && sudo apt upgrade -y</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo apt update && sudo apt upgrade -y');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>sudo apt install nginx nodejs npm git -y</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo apt install nginx nodejs npm git -y');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>npm install -g pm2</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('npm install -g pm2');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 2: Download Code */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">2</div>
                    <h4 className="font-semibold">{language === 'zh' ? '下载代码' : 'Download Code'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <p className="text-muted-foreground mb-2"># {language === 'zh' ? '从GitHub克隆代码' : 'Clone from GitHub'}</p>
                    <div className="flex items-center justify-between">
                      <code>git clone YOUR_GITHUB_REPO_URL</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('git clone YOUR_GITHUB_REPO_URL');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>cd YOUR_PROJECT_FOLDER</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('cd YOUR_PROJECT_FOLDER');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Alert className="ml-10 border-primary/30 bg-primary/5">
                    <FileCode className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {language === 'zh' 
                        ? '在Lovable编辑器中点击 GitHub → Connect to GitHub 连接并创建仓库' 
                        : 'In Lovable editor, click GitHub → Connect to GitHub to connect and create repository'}
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Step 3: Create Supabase Project */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">3</div>
                    <h4 className="font-semibold">{language === 'zh' ? '创建Supabase项目' : 'Create Supabase Project'}</h4>
                  </div>
                  <div className="ml-10 space-y-3">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>{language === 'zh' ? '访问 supabase.com 创建免费账户' : 'Go to supabase.com and create free account'}</li>
                      <li>{language === 'zh' ? '创建新项目，记住数据库密码' : 'Create new project, remember database password'}</li>
                      <li>{language === 'zh' ? '进入 SQL Editor' : 'Go to SQL Editor'}</li>
                      <li>{language === 'zh' ? '点击上方 "Download Complete SQL" 下载SQL文件' : 'Click "Download Complete SQL" above to get SQL file'}</li>
                      <li>{language === 'zh' ? '粘贴并运行整个SQL' : 'Paste and run the entire SQL'}</li>
                    </ol>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '打开Supabase' : 'Open Supabase'}
                    </Button>
                  </div>
                </div>

                {/* Step 4: Environment Setup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">4</div>
                    <h4 className="font-semibold">{language === 'zh' ? '配置环境变量' : 'Setup Environment Variables'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <p className="text-muted-foreground mb-2"># {language === 'zh' ? '创建 .env 文件' : 'Create .env file'}</p>
                    <div className="flex items-center justify-between">
                      <code>nano .env</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('nano .env');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-xs space-y-1">
                    <p className="text-muted-foreground mb-2"># .env {language === 'zh' ? '文件内容' : 'file contents'}</p>
                    <pre className="whitespace-pre-wrap break-all">{`VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID`}</pre>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_ID`);
                        toast({ title: 'Copied!' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '复制模板' : 'Copy Template'}
                    </Button>
                  </div>
                  <Alert className="ml-10 border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
                    <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                    <AlertDescription className="text-sm">
                      {language === 'zh' 
                        ? '从Supabase项目设置 → API 获取URL和anon key' 
                        : 'Get URL and anon key from Supabase Project Settings → API'}
                    </AlertDescription>
                  </Alert>
                </div>

                {/* Step 5: Build & Deploy */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">5</div>
                    <h4 className="font-semibold">{language === 'zh' ? '构建项目' : 'Build Project'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <code>npm install</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('npm install');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>npm run build</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('npm run build');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="ml-10 text-sm text-muted-foreground">
                    {language === 'zh' 
                      ? '构建完成后会生成 dist/ 文件夹，这就是要部署的静态文件' 
                      : 'After build, dist/ folder will be created - these are the static files to deploy'}
                  </p>
                </div>

                {/* Step 6: Nginx Config */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">6</div>
                    <h4 className="font-semibold">{language === 'zh' ? '配置Nginx' : 'Configure Nginx'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <code>sudo nano /etc/nginx/sites-available/gateway</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo nano /etc/nginx/sites-available/gateway');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                    <pre className="whitespace-pre">{`server {
    listen 80;
    server_name your-domain.com;
    root /var/www/gateway/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}`}</pre>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`server {
    listen 80;
    server_name your-domain.com;
    root /var/www/gateway/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}`);
                        toast({ title: 'Copied!' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {language === 'zh' ? '复制配置' : 'Copy Config'}
                    </Button>
                  </div>
                </div>

                {/* Step 7: Enable Site & SSL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">7</div>
                    <h4 className="font-semibold">{language === 'zh' ? '启用站点 & SSL' : 'Enable Site & SSL'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <p className="text-muted-foreground mb-2"># {language === 'zh' ? '复制构建文件到网站目录' : 'Copy build files to web directory'}</p>
                    <div className="flex items-center justify-between">
                      <code>sudo mkdir -p /var/www/gateway</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo mkdir -p /var/www/gateway');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>sudo cp -r dist/* /var/www/gateway/</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo cp -r dist/* /var/www/gateway/');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground mt-4 mb-2"># {language === 'zh' ? '启用站点' : 'Enable site'}</p>
                    <div className="flex items-center justify-between">
                      <code>sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>sudo nginx -t && sudo systemctl reload nginx</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo nginx -t && sudo systemctl reload nginx');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground mt-4 mb-2"># {language === 'zh' ? '安装SSL证书 (免费)' : 'Install SSL Certificate (free)'}</p>
                    <div className="flex items-center justify-between">
                      <code>sudo apt install certbot python3-certbot-nginx -y</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo apt install certbot python3-certbot-nginx -y');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>sudo certbot --nginx -d your-domain.com</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sudo certbot --nginx -d your-domain.com');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 8: Deploy Edge Functions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">8</div>
                    <h4 className="font-semibold">{language === 'zh' ? '部署Edge Functions' : 'Deploy Edge Functions'}</h4>
                  </div>
                  <div className="ml-10 p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
                    <p className="text-muted-foreground mb-2"># {language === 'zh' ? '安装Supabase CLI' : 'Install Supabase CLI'}</p>
                    <div className="flex items-center justify-between">
                      <code>npm install -g supabase</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('npm install -g supabase');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground mt-4 mb-2"># {language === 'zh' ? '登录并部署' : 'Login and deploy'}</p>
                    <div className="flex items-center justify-between">
                      <code>supabase login</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('supabase login');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>supabase link --project-ref YOUR_PROJECT_ID</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('supabase link --project-ref YOUR_PROJECT_ID');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <code>supabase functions deploy</code>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('supabase functions deploy');
                          toast({ title: 'Copied!' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Success */}
                <Alert className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  <AlertDescription className="text-sm font-medium">
                    {language === 'zh' 
                      ? '🎉 完成！访问 https://your-domain.com 查看您的网关' 
                      : '🎉 Done! Visit https://your-domain.com to see your gateway'}
                  </AlertDescription>
                </Alert>

                {/* Quick Copy All Commands */}
                <div className="pt-4 border-t">
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      const allCommands = `# Prerequisites
sudo apt update && sudo apt upgrade -y
sudo apt install nginx nodejs npm git -y
npm install -g pm2

# Clone and Build
git clone YOUR_GITHUB_REPO_URL
cd YOUR_PROJECT_FOLDER
npm install
npm run build

# Deploy
sudo mkdir -p /var/www/gateway
sudo cp -r dist/* /var/www/gateway/
sudo ln -s /etc/nginx/sites-available/gateway /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com

# Edge Functions
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy`;
                      navigator.clipboard.writeText(allCommands);
                      toast({ 
                        title: language === 'zh' ? '已复制所有命令' : 'All Commands Copied',
                        description: language === 'zh' ? '粘贴到终端执行' : 'Paste to terminal to execute'
                      });
                    }}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '复制所有命令' : 'Copy All Commands'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Domain Configuration Checker */}
            <Card className="border-2 border-primary/20 overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Wifi className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'zh' ? '域名配置检查器' : 'Domain Configuration Checker'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' 
                        ? '验证DNS、SSL和HTTP配置' 
                        : 'Validate DNS, SSL and HTTP configuration'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder={language === 'zh' ? '输入域名 (例如: example.com)' : 'Enter domain (e.g., example.com)'}
                    value={domainToCheck}
                    onChange={(e) => setDomainToCheck(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={checkDomainConfiguration}
                    disabled={isCheckingDomain}
                    className="btn-gradient-primary"
                  >
                    {isCheckingDomain ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === 'zh' ? '检查中...' : 'Checking...'}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '检查域名' : 'Check Domain'}
                      </>
                    )}
                  </Button>
                </div>

                {domainCheckResults && (
                  <div className="space-y-3 mt-4">
                    {/* DNS Check */}
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        domainCheckResults.dns?.status === 'success' 
                          ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
                          : domainCheckResults.dns?.status === 'error'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {domainCheckResults.dns?.status === 'success' ? (
                          <Check className="h-4 w-4" />
                        ) : domainCheckResults.dns?.status === 'error' ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">DNS Records</p>
                        <p className="text-xs text-muted-foreground">{domainCheckResults.dns?.message}</p>
                      </div>
                    </div>

                    {/* SSL Check */}
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        domainCheckResults.ssl?.status === 'success' 
                          ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
                          : domainCheckResults.ssl?.status === 'error'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {domainCheckResults.ssl?.status === 'success' ? (
                          <Lock className="h-4 w-4" />
                        ) : domainCheckResults.ssl?.status === 'error' ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">SSL Certificate</p>
                        <p className="text-xs text-muted-foreground">{domainCheckResults.ssl?.message}</p>
                      </div>
                    </div>

                    {/* HTTP Check */}
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        domainCheckResults.http?.status === 'success' 
                          ? 'bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]'
                          : domainCheckResults.http?.status === 'error'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}>
                        {domainCheckResults.http?.status === 'success' ? (
                          <Globe className="h-4 w-4" />
                        ) : domainCheckResults.http?.status === 'error' ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">HTTP/HTTPS Access</p>
                        <p className="text-xs text-muted-foreground">{domainCheckResults.http?.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Alert className="border-primary/30 bg-primary/5">
                  <Globe className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {language === 'zh' 
                      ? '使用DNSChecker.org进行更详细的DNS传播检查' 
                      : 'Use DNSChecker.org for detailed DNS propagation checks'}
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 h-auto ml-2"
                      onClick={() => window.open('https://dnschecker.org', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      DNSChecker.org
                    </Button>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Custom Deploy Script Generator */}
            <Card className="border-2 border-primary/20 overflow-hidden mt-6">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>
                      {language === 'zh' ? '一键部署脚本生成器' : 'One-Click Deploy Script Generator'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'zh' 
                        ? '生成预填充的自动部署脚本' 
                        : 'Generate pre-filled automated deployment script'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? '您的域名' : 'Your Domain'}</Label>
                    <Input
                      placeholder="example.com"
                      value={deployScriptDomain}
                      onChange={(e) => setDeployScriptDomain(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'zh' ? 'GitHub仓库URL' : 'GitHub Repo URL'}</Label>
                    <Input
                      placeholder="https://github.com/user/repo"
                      value={deployScriptGithubUrl}
                      onChange={(e) => setDeployScriptGithubUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowDeployScript(true)}
                    className="btn-gradient-primary flex-1"
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '生成部署脚本' : 'Generate Deploy Script'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const script = generateDeployScript();
                      const blob = new Blob([script], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'deploy-gateway.sh';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast({ 
                        title: language === 'zh' ? '已下载' : 'Downloaded',
                        description: 'deploy-gateway.sh'
                      });
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'zh' ? '下载.sh文件' : 'Download .sh'}
                  </Button>
                </div>

                {showDeployScript && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{language === 'zh' ? '生成的脚本' : 'Generated Script'}</Label>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generateDeployScript());
                          toast({ title: language === 'zh' ? '已复制脚本' : 'Script Copied' });
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {language === 'zh' ? '复制' : 'Copy'}
                      </Button>
                    </div>
                    <div className="p-4 bg-muted rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{generateDeployScript()}</pre>
                    </div>
                  </div>
                )}

                <Alert className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
                  <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                  <AlertDescription className="text-sm">
                    {language === 'zh' 
                      ? '运行脚本前请编辑 .env 文件中的 VITE_SUPABASE_PUBLISHABLE_KEY' 
                      : 'Edit VITE_SUPABASE_PUBLISHABLE_KEY in .env before running the script'}
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium text-sm mb-2">{language === 'zh' ? '使用方法' : 'How to Use'}</p>
                  <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                    <li>{language === 'zh' ? '填写域名和GitHub仓库URL' : 'Fill in your domain and GitHub repo URL'}</li>
                    <li>{language === 'zh' ? '下载脚本或复制到VPS' : 'Download script or copy to VPS'}</li>
                    <li>{language === 'zh' ? '运行: chmod +x deploy-gateway.sh && ./deploy-gateway.sh' : 'Run: chmod +x deploy-gateway.sh && ./deploy-gateway.sh'}</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border mt-6">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{language === 'zh' ? '安全提示' : 'Security Tips'}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      <li>{language === 'zh' ? '使用强大、唯一的密码' : 'Use a strong, unique password'}</li>
                      <li>{language === 'zh' ? '启用2FA以获得额外安全' : 'Enable 2FA for additional security'}</li>
                      <li>{language === 'zh' ? '切勿与任何人分享您的密码' : 'Never share your passwords with anyone'}</li>
                      <li>{language === 'zh' ? '定期更改密码' : 'Change passwords regularly'}</li>
                      <li>{language === 'zh' ? '定期备份数据库' : 'Backup database regularly'}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {language === 'zh' ? '设置Google Authenticator' : 'Setup Google Authenticator'}
            </DialogTitle>
            <DialogDescription>
              {language === 'zh' 
                ? '使用Google Authenticator应用扫描下方二维码' 
                : 'Scan the QR code below with your Google Authenticator app'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {totpUri && (
                <QRCodeSVG value={totpUri} size={200} level="H" />
              )}
            </div>

            {/* Manual entry */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                {language === 'zh' ? '或手动输入密钥:' : 'Or enter this code manually:'}
              </Label>
              <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all text-center">
                {totpSecret}
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <Label>
                {language === 'zh' ? '输入6位验证码' : 'Enter 6-digit verification code'}
              </Label>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShow2FASetup(false)}>
              {language === 'zh' ? '取消' : 'Cancel'}
            </Button>
            <Button 
              onClick={verifyAndEnable2FA} 
              disabled={verificationCode.length !== 6 || isVerifying}
              className="btn-gradient-primary"
            >
              {isVerifying ? (language === 'zh' ? '验证中...' : 'Verifying...') : (language === 'zh' ? '验证并启用' : 'Verify & Enable')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminSettingsPage;