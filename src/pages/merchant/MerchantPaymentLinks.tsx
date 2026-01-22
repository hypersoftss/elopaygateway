import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Link2, Plus, Copy, Check, Trash2, RefreshCw, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentLink {
  id: string;
  link_code: string;
  amount: number;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const MerchantPaymentLinks = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLink, setNewLink] = useState({
    amount: '',
    description: '',
    hasExpiry: false,
    expiryDate: '',
  });

  const fetchLinks = async () => {
    if (!user?.merchantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('merchant_id', user.merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching payment links:', error);
      toast({
        title: t('common.error'),
        description: t('errors.fetchFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [user?.merchantId]);

  const generateLinkCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateLink = async () => {
    if (!user?.merchantId || !newLink.amount) return;
    
    setIsCreating(true);
    try {
      const linkCode = generateLinkCode();
      
      const { error } = await supabase
        .from('payment_links')
        .insert({
          merchant_id: user.merchantId,
          link_code: linkCode,
          amount: parseFloat(newLink.amount),
          description: newLink.description || null,
          expires_at: newLink.hasExpiry && newLink.expiryDate ? new Date(newLink.expiryDate).toISOString() : null,
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('merchant.linkCreated'),
      });

      setNewLink({ amount: '', description: '', hasExpiry: false, expiryDate: '' });
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast({
        title: t('common.error'),
        description: t('errors.createFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (link: PaymentLink) => {
    try {
      const { error } = await supabase
        .from('payment_links')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;

      setLinks(links.map(l => l.id === link.id ? { ...l, is_active: !l.is_active } : l));
      toast({
        title: t('common.success'),
        description: link.is_active ? t('merchant.linkDeactivated') : t('merchant.linkActivated'),
      });
    } catch (error) {
      console.error('Error toggling link:', error);
      toast({
        title: t('common.error'),
        description: t('errors.updateFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLink = async () => {
    if (!deleteId) return;
    
    try {
      const { error } = await supabase
        .from('payment_links')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setLinks(links.filter(l => l.id !== deleteId));
      toast({
        title: t('common.success'),
        description: t('merchant.linkDeleted'),
      });
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: t('common.error'),
        description: t('errors.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const copyToClipboard = (linkCode: string) => {
    const url = `${window.location.origin}/pay/${linkCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkCode);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: t('common.copied'),
      description: t('merchant.linkCopied'),
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(var(--success))]/20 to-[hsl(var(--success))]/5">
              <Link2 className="h-6 w-6 text-[hsl(var(--success))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('merchant.paymentLinks')}</h1>
              <p className="text-sm text-muted-foreground">{t('merchant.paymentLinksDesc')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLinks}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.refresh')}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gradient-success">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('merchant.createLink')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('merchant.createPaymentLink')}</DialogTitle>
                  <DialogDescription>{t('merchant.createPaymentLinkDesc')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('transactions.amount')} *</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={newLink.amount}
                      onChange={(e) => setNewLink({ ...newLink, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.description')}</Label>
                    <Textarea
                      placeholder={t('merchant.linkDescriptionPlaceholder')}
                      value={newLink.description}
                      onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>{t('merchant.setExpiry')}</Label>
                    <Switch
                      checked={newLink.hasExpiry}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, hasExpiry: checked })}
                    />
                  </div>
                  {newLink.hasExpiry && (
                    <div className="space-y-2">
                      <Label>{t('merchant.expiryDate')}</Label>
                      <Input
                        type="datetime-local"
                        value={newLink.expiryDate}
                        onChange={(e) => setNewLink({ ...newLink, expiryDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleCreateLink}
                    disabled={isCreating || !newLink.amount}
                    className="btn-gradient-success"
                  >
                    {isCreating ? t('common.creating') : t('merchant.createLink')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="stat-card border-l-4 border-l-[hsl(var(--success))]">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.totalLinks')}</p>
                  <p className="text-2xl font-bold">{links.length}</p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--success))]/10">
                  <Link2 className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.activeLinks')}</p>
                  <p className="text-2xl font-bold text-primary">{links.filter(l => l.is_active && !isExpired(l.expires_at)).length}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Check className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card border-l-4 border-l-[hsl(var(--warning))]">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{t('merchant.totalValue')}</p>
                  <p className="text-2xl font-bold">₹{links.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-[hsl(var(--warning))]/10">
                  <QrCode className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Links Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('merchant.linkCode')}</TableHead>
                    <TableHead className="text-right">{t('transactions.amount')}</TableHead>
                    <TableHead>{t('common.description')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('merchant.expiresAt')}</TableHead>
                    <TableHead>{t('common.createdAt')}</TableHead>
                    <TableHead className="text-center">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : links.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('merchant.noPaymentLinks')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    links.map((link) => (
                      <TableRow key={link.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm">{link.link_code}</TableCell>
                        <TableCell className="text-right font-semibold">₹{link.amount.toLocaleString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{link.description || '-'}</TableCell>
                        <TableCell>
                          {isExpired(link.expires_at) ? (
                            <Badge variant="destructive">{t('status.expired')}</Badge>
                          ) : link.is_active ? (
                            <Badge className="bg-[hsl(var(--success))] text-white">{t('status.active')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('status.inactive')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {link.expires_at ? format(new Date(link.expires_at), 'MMM dd, yyyy HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(link.created_at), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(link.link_code)}
                            >
                              {copiedId === link.link_code ? (
                                <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`/pay/${link.link_code}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(link)}
                            >
                              <Switch checked={link.is_active} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(link.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('merchant.deleteLink')}</AlertDialogTitle>
              <AlertDialogDescription>{t('merchant.deleteLinkConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLink} className="bg-destructive hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default MerchantPaymentLinks;
