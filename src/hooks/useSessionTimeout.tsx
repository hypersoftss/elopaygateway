import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useSessionTimeout = () => {
  const { user, rememberMe, logout } = useAuthStore();
  const { toast } = useToast();
  const { t } = useTranslation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const timeout = rememberMe ? REMEMBER_ME_TIMEOUT : DEFAULT_TIMEOUT;

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        toast({
          title: t('auth.sessionExpired'),
          variant: 'destructive',
        });
        logout();
      }, timeout);
    }
  }, [user, timeout, logout, toast, t]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, resetTimer]);
};
