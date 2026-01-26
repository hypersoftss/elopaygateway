import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useTranslation } from "@/lib/i18n";
import { useGatewaySettings } from "@/hooks/useGatewaySettings";

const NotFound = () => {
  const location = useLocation();
  const { language } = useTranslation();
  const { settings } = useGatewaySettings();
  const isEnglish = language === 'en';

  const gatewayName = settings.gatewayName || 'ELOPAY';
  const logoUrl = settings.logoUrl;

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-destructive/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-xl object-contain shadow-lg ring-2 ring-primary/20" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="text-xl font-bold">{gatewayName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-destructive/20 to-destructive/5 mb-4 shadow-lg">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>

          {/* Error Code */}
          <h1 className="text-7xl font-bold bg-gradient-to-r from-destructive to-destructive/70 bg-clip-text text-transparent">
            404
          </h1>

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              {isEnglish ? 'Page Not Found' : '页面未找到'}
            </h2>
            <p className="text-muted-foreground">
              {isEnglish 
                ? "The page you're looking for doesn't exist or has been moved."
                : '您访问的页面不存在或已被移动。'}
            </p>
          </div>

          {/* Attempted Path */}
          <div className="bg-muted/50 rounded-lg px-4 py-2 inline-block">
            <code className="text-sm text-muted-foreground font-mono">
              {location.pathname}
            </code>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button asChild size="lg" className="h-12 px-8 gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Link to="/">
                <Home className="h-5 w-5" />
                {isEnglish ? 'Back to Home' : '返回首页'}
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-xl py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {gatewayName}. {isEnglish ? 'All rights reserved.' : '版权所有'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
