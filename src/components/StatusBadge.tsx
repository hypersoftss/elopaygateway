import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';

type Status = 'pending' | 'success' | 'failed';

interface StatusBadgeProps {
  status: Status;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { t } = useTranslation();

  const variants: Record<Status, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    success: 'default',
    failed: 'destructive',
  };

  const labels: Record<Status, string> = {
    pending: t('transactions.pending'),
    success: t('transactions.success'),
    failed: t('transactions.failed'),
  };

  const colors: Record<Status, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <Badge variant="outline" className={colors[status]}>
      {labels[status]}
    </Badge>
  );
};
