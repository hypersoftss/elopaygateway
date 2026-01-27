import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie-consent-accepted';

interface CookieConsentProps {
  isEnglish?: boolean;
}

export const CookieConsent = ({ isEnglish = true }: CookieConsentProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsent) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[100] p-4 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="container mx-auto max-w-4xl">
        <div className="relative rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 p-6">
          {/* Close button */}
          <button
            onClick={handleDecline}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Icon */}
            <div className="shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Cookie className="h-6 w-6 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 pr-6 sm:pr-0">
              <h3 className="font-semibold text-foreground mb-1">
                {isEnglish ? 'We use cookies' : '我们使用Cookies'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isEnglish 
                  ? 'We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. By clicking "Accept", you consent to our use of cookies.'
                  : '我们使用cookies来增强您的体验、分析网站流量并用于营销目的。点击"接受"即表示您同意我们使用cookies。'
                }
                {' '}
                <Link 
                  to="/privacy" 
                  className="text-primary hover:underline font-medium"
                >
                  {isEnglish ? 'Learn more' : '了解更多'}
                </Link>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="flex-1 sm:flex-none"
              >
                {isEnglish ? 'Decline' : '拒绝'}
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="flex-1 sm:flex-none"
              >
                {isEnglish ? 'Accept' : '接受'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
