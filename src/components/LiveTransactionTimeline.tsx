import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/lib/i18n';
import { format } from 'date-fns';
import { Activity, ArrowDownRight, ArrowUpRight, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  order_no: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  oldStatus?: string;
  eventType: 'insert' | 'update';
  merchant_name?: string;
  timestamp: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; pulse?: boolean }> = {
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    pulse: true,
  },
  processing: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/30',
    pulse: true,
  },
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-green-500',
    bg: 'bg-green-500/10 border-green-500/30',
  },
  failed: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/30',
  },
};

export const LiveTransactionTimeline = () => {
  const { language } = useTranslation();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Load recent payout events on mount
    const loadRecent = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, order_no, amount, status, created_at, updated_at, merchants(merchant_name)')
        .eq('transaction_type', 'payout')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (data) {
        const initial: TimelineEvent[] = data.map((tx: any) => ({
          id: tx.id,
          order_no: tx.order_no,
          amount: tx.amount,
          status: tx.status,
          eventType: 'insert' as const,
          merchant_name: tx.merchants?.merchant_name,
          timestamp: tx.updated_at || tx.created_at,
        }));
        setEvents(initial);
      }
    };

    loadRecent();

    const channel = supabase
      .channel('withdrawal-timeline')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: 'transaction_type=eq.payout' },
        (payload) => {
          const tx = payload.new as any;
          setEvents((prev) => [{
            id: tx.id + '-insert-' + Date.now(),
            order_no: tx.order_no,
            amount: tx.amount,
            status: tx.status || 'pending',
            eventType: 'insert' as const,
            timestamp: tx.created_at || new Date().toISOString(),
          } satisfies TimelineEvent, ...prev].slice(0, 50));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: 'transaction_type=eq.payout' },
        (payload) => {
          const tx = payload.new as any;
          const old = payload.old as any;
          if (old.status !== tx.status) {
            setEvents((prev) => [{
              id: tx.id + '-update-' + Date.now(),
              order_no: tx.order_no,
              amount: tx.amount,
              status: tx.status,
              oldStatus: old.status,
              eventType: 'update',
              timestamp: tx.updated_at || new Date().toISOString(),
            }, ...prev].slice(0, 50));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-500" />
            {language === 'zh' ? '实时动态' : 'Live Timeline'}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground font-normal">
              {isConnected ? (language === 'zh' ? '已连接' : 'Live') : (language === 'zh' ? '断开' : 'Offline')}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[300px] pr-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <AlertCircle className="h-8 w-8 opacity-40" />
              <p>{language === 'zh' ? '暂无动态' : 'No events yet'}</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

              {events.map((event, idx) => {
                const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                return (
                  <div key={event.id} className="relative flex gap-3 py-2 group">
                    {/* Dot */}
                    <div className={`relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border ${config.bg} shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {event.eventType === 'insert' ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 border-purple-500/20">
                            <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />
                            {language === 'zh' ? '新请求' : 'NEW'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                            <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                            {language === 'zh' ? '状态更新' : 'UPDATE'}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.bg} ${config.color}`}>
                          {event.status.toUpperCase()}
                        </Badge>
                        {event.oldStatus && (
                          <span className="text-[10px] text-muted-foreground">
                            {event.oldStatus} → {event.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs truncate">{event.order_no}</span>
                        <span className="text-xs font-semibold">₹{event.amount.toLocaleString()}</span>
                      </div>
                      {event.merchant_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{event.merchant_name}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(event.timestamp), 'HH:mm:ss · dd MMM')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
