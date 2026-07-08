import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { RetryError } from '@/components/common/RetryError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useRefundSale, useSale } from '@/hooks/useSales';
import { useAuth } from '@/stores/authStore';
import { useCurrency } from '@/stores/businessStore';
import { formatCurrency, formatDate } from '@/lib/format';
import { extractApiError } from '@/lib/api';

const refundSchema = z.object({
  reason: z.string().trim().min(3, 'Minimum 3 characters').max(500),
});
type RefundValues = z.infer<typeof refundSchema>;

function isSameDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const currency = useCurrency();
  const { data, isLoading, isError, error, refetch } = useSale(id);
  const refundMut = useRefundSale();
  const [refundOpen, setRefundOpen] = useState(false);

  const form = useForm<RefundValues>({
    resolver: zodResolver(refundSchema),
    defaultValues: { reason: '' },
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Sale" description="Loading…" />
        <Skeleton className="h-64" />
      </>
    );
  }
  if (isError) return <RetryError error={error} onRetry={() => refetch()} />;
  if (!data || !user) return null;

  const isCashier = user.role === 'CASHIER';
  const isOwner = user.role === 'OWNER';
  const isOwnSale = data.cashierId === user.id;
  const refundable =
    data.status === 'COMPLETED' &&
    (isOwner || (isCashier && isOwnSale && isSameDay(data.createdAt)));
  const refundDisabledReason = !refundable
    ? data.status === 'REFUNDED'
      ? 'Already refunded'
      : isCashier && !isOwnSale
        ? 'Only the cashier who rang it up (or an owner) can refund.'
        : isCashier && !isSameDay(data.createdAt)
          ? 'Cashier may only refund same-day sales. Ask the owner.'
          : 'Refund not available.'
    : '';

  const onRefund = form.handleSubmit(async ({ reason }) => {
    if (!id) return;
    try {
      await refundMut.mutateAsync({ id, reason });
      toast.success('Sale refunded — stock restored');
      setRefundOpen(false);
      form.reset();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  });

  return (
    <>
      <PageHeader
        title={data.saleNumber}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            {data.status === 'COMPLETED' ? (
              <Badge variant="success">Completed</Badge>
            ) : (
              <Badge variant="destructive">Refunded</Badge>
            )}
            <span>{formatDate(data.createdAt, 'long')}</span>
            <span>·</span>
            <span>by {data.cashier?.name ?? 'Unknown'}</span>
            <span>·</span>
            <Badge variant="secondary">{data.paymentMethod}</Badge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/sales">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Link>
            </Button>
            <Button
              onClick={() => setRefundOpen(true)}
              disabled={!refundable}
              title={refundDisabledReason || undefined}
              variant={refundable ? 'destructive' : 'outline'}
            >
              <Undo2 className="h-4 w-4 mr-2" /> Refund
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Items</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Line Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.productName}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatCurrency(it.productPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(it.lineTotal, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden self-start">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold">Totals</h2>
          </div>
          <div className="p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(data.subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(data.taxAmount, currency)}
              </span>
            </div>
            <div className="border-t border-border pt-3 mt-2 flex justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCurrency(data.total, currency)}
              </span>
            </div>
            {data.status === 'REFUNDED' && (
              <div className="mt-4 pt-4 border-t border-border space-y-2 text-xs">
                <p className="text-muted-foreground">
                  Refunded {formatDate(data.refundedAt, 'long')}
                </p>
                {data.refundReason && (
                  <div className="bg-destructive/10 text-destructive border border-destructive/20 p-3 rounded-md">
                    <p className="font-medium uppercase tracking-wide text-[10px] mb-1">Reason</p>
                    <p>{data.refundReason}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund {data.saleNumber}?</DialogTitle>
            <DialogDescription>
              Stock will be restored for all {data.items.length} item(s). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onRefund} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder="Customer changed mind / damaged item / etc."
                {...form.register('reason')}
              />
              {form.formState.errors.reason && (
                <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRefundOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={refundMut.isPending}>
                {refundMut.isPending && <Spinner className="mr-2" />} Confirm refund
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
