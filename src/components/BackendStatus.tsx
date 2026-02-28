import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'checking' | 'online' | 'offline';

export const BackendStatus = ({ language = 'en' }: { language?: 'zh' | 'en' }) => {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const { error } = await supabase.rpc('get_gateway_branding');
        clearTimeout(timeout);
        if (mounted) setStatus(error ? 'offline' : 'online');
      } catch {
        if (mounted) setStatus('offline');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (status === 'checking') return null;

  const isOnline = status === 'online';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
      isOnline
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        : 'bg-destructive/10 text-destructive animate-pulse'
    }`}>
      {isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span>
        {isOnline
          ? (language === 'zh' ? '已连接' : 'Connected')
          : (language === 'zh' ? '无法连接服务器' : 'Server unreachable')}
      </span>
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-destructive'}`} />
    </div>
  );
};
