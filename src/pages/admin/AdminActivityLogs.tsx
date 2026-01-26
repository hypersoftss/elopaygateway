import { useState, useEffect } from 'react';
import { History, Search, RefreshCw, User, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ActivityLog {
  id: string;
  merchant_id: string;
  admin_user_id: string | null;
  action_type: string;
  action_details: any;
  old_values: any;
  new_values: any;
  created_at: string;
  merchants?: {
    merchant_name: string;
    account_number: string;
  };
}

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  fee_update: { label: 'Fee Update', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  gateway_update: { label: 'Gateway Change', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  bulk_gateway_assign: { label: 'Bulk Gateway', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  password_reset: { label: 'Password Reset', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  withdrawal_password_reset: { label: 'Withdrawal Pass Reset', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  '2fa_reset': { label: '2FA Reset', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  status_change: { label: 'Status Change', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  delete: { label: 'Deleted', color: 'bg-destructive/10 text-destructive border-destructive/20' },
  create: { label: 'Created', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
};

const AdminActivityLogs = () => {
  const { t, language } = useTranslation();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchant_activity_logs')
        .select(`
          *,
          merchants (merchant_name, account_number)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.merchants?.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.merchants?.account_number?.includes(searchQuery) ||
      log.action_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const formatActionDetails = (log: ActivityLog) => {
    const details = log.action_details;
    if (!details) return '-';
    
    if (log.action_type === 'fee_update') {
      return `Payin: ${log.old_values?.payin_fee || '-'}% → ${log.new_values?.payin_fee || '-'}%, Payout: ${log.old_values?.payout_fee || '-'}% → ${log.new_values?.payout_fee || '-'}%`;
    }
    
    if (log.action_type === 'gateway_update' || log.action_type === 'bulk_gateway_assign') {
      return `Gateway: ${details.gateway_name || 'Unknown'}${details.trade_type ? ` (${details.trade_type})` : ''}`;
    }
    
    return JSON.stringify(details).slice(0, 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5">
              <History className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{language === 'zh' ? '活动日志' : 'Activity Logs'}</h1>
              <p className="text-sm text-muted-foreground">
                {language === 'zh' ? '追踪商户账户的所有管理员操作' : 'Track all admin actions on merchant accounts'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={language === 'zh' ? '搜索商户或操作...' : 'Search merchant or action...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="fee_update">Fee Updates</SelectItem>
                  <SelectItem value="gateway_update">Gateway Changes</SelectItem>
                  <SelectItem value="bulk_gateway_assign">Bulk Gateway</SelectItem>
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                  <SelectItem value="2fa_reset">2FA Reset</SelectItem>
                  <SelectItem value="status_change">Status Change</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {language === 'zh' ? '最近活动' : 'Recent Activity'}
            </CardTitle>
            <CardDescription>
              {filteredLogs.length} {language === 'zh' ? '条记录' : 'records found'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{language === 'zh' ? '时间' : 'Time'}</TableHead>
                  <TableHead>{language === 'zh' ? '商户' : 'Merchant'}</TableHead>
                  <TableHead>{language === 'zh' ? '操作类型' : 'Action Type'}</TableHead>
                  <TableHead>{language === 'zh' ? '详情' : 'Details'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {language === 'zh' ? '暂无活动记录' : 'No activity logs found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const actionInfo = ACTION_TYPE_LABELS[log.action_type] || { label: log.action_type, color: 'bg-muted text-muted-foreground' };
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-primary/10">
                              <User className="h-3 w-3 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{log.merchants?.merchant_name || 'Deleted'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{log.merchants?.account_number || '-'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionInfo.color}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground max-w-xs truncate">
                            {formatActionDetails(log)}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminActivityLogs;
