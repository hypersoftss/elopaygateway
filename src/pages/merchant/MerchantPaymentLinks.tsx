import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Plus, Copy, ExternalLink } from 'lucide-react';
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
      toast({ title: 'Error', description: 'Failed to fetch payment links', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [user?.merchantId]);

  const generateLinkCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
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

      toast({ title: 'Success', description: 'Payment link created' });
      setNewLink({ amount: '', description: '', hasExpiry: false, expiryDate: '' });
      setIsDialogOpen(false);
      fetchLinks();
    } catch (error) {
      console.error('Error creating payment link:', error);
      toast({ title: 'Error', description: 'Failed to create payment link', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (linkCode: string) => {
    const url = `${window.location.origin}/pay/${linkCode}`;
    navigator.clipboard.writeText(url);
    setCopiedId(linkCode);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied', description: 'Link copied to clipboard' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Payment Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Link</DialogTitle>
                <DialogDescription>Create a new payment link for your customers</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={newLink.amount}
                    onChange={(e) => setNewLink({ ...newLink, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Payment for..."
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Set Expiry</Label>
                  <Switch
                    checked={newLink.hasExpiry}
                    onCheckedChange={(checked) => setNewLink({ ...newLink, hasExpiry: checked })}
                  />
                </div>
                {newLink.hasExpiry && (
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="datetime-local"
                      value={newLink.expiryDate}
                      onChange={(e) => setNewLink({ ...newLink, expiryDate: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateLink}
                  disabled={isCreating || !newLink.amount}
                  className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90"
                >
                  {isCreating ? 'Creating...' : 'Create Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Links Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Link Code</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Expires At</TableHead>
                  <TableHead className="text-muted-foreground">Created At</TableHead>
                  <TableHead className="text-muted-foreground text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : links.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payment links yet
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((link) => (
                    <TableRow key={link.id} className="border-border">
                      <TableCell className="font-mono text-sm">{link.link_code}</TableCell>
                      <TableCell className="text-[hsl(var(--success))] font-semibold">₹{link.amount.toFixed(2)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{link.description || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          className={link.is_active 
                            ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90' 
                            : 'bg-muted text-muted-foreground'
                          }
                        >
                          {link.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {link.expires_at ? format(new Date(link.expires_at), 'yyyy-MM-dd') : 'Never'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(link.created_at), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => copyToClipboard(link.link_code)}
                          >
                            <Copy className={`h-4 w-4 ${copiedId === link.link_code ? 'text-[hsl(var(--success))]' : ''}`} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => window.open(`/pay/${link.link_code}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MerchantPaymentLinks;
