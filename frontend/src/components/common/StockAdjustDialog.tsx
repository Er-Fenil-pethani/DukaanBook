import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useAdjustStock } from '@/hooks/useProducts';
import { extractApiError } from '@/lib/api';

const TYPES = [
  { value: 'PURCHASE', label: 'Purchase (stock in)' },
  { value: 'RETURN', label: 'Return (stock in)' },
  { value: 'ADJUSTMENT', label: 'Adjustment (manual)' },
  { value: 'DAMAGE', label: 'Damage (stock out)' },
] as const;

const schema = z.object({
  type: z.enum(['PURCHASE', 'RETURN', 'ADJUSTMENT', 'DAMAGE']),
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().trim().min(1, 'Reason is required').max(200),
  notes: z.string().max(500).optional(),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productName: string;
  currentStock: number;
}

export function StockAdjustDialog({ open, onOpenChange, productId, productName, currentStock }: Props) {
  const mut = useAdjustStock();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'PURCHASE', quantity: 0, reason: '', notes: '' },
  });
  const watchType = form.watch('type');
  const watchQty = form.watch('quantity');
  const previewQty = Number(watchQty) || 0;
  const signedDelta = watchType === 'DAMAGE' && previewQty > 0 ? -previewQty : previewQty;
  const projected = currentStock + signedDelta;

  const submit = form.handleSubmit(async (values) => {
    try {
      const signed = values.type === 'DAMAGE' && values.quantity > 0 ? -values.quantity : values.quantity;
      await mut.mutateAsync({
        productId,
        type: values.type,
        quantity: signed,
        reason: values.reason,
        notes: values.notes || null,
      });
      toast.success('Stock adjusted');
      form.reset({ type: 'PURCHASE', quantity: 0, reason: '', notes: '' });
      onOpenChange(false);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
          <DialogDescription>
            Current stock: <span className="font-mono">{currentStock}</span>. Adjustments are
            audit-logged with your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={watchType}
              onValueChange={(v) => form.setValue('type', v as Values['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" {...form.register('quantity')} />
            <p className="text-xs text-muted-foreground">
              {watchType === 'DAMAGE'
                ? 'Damage records always reduce stock. Enter a positive number.'
                : 'Use a negative number to reduce stock for ADJUSTMENT.'}
            </p>
            {form.formState.errors.quantity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.quantity.message}
              </p>
            )}
            <p className="text-xs">
              <span className="text-muted-foreground">After adjustment:</span>{' '}
              <span className={projected < 0 ? 'text-destructive font-semibold' : 'font-semibold'}>
                {projected}
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" {...form.register('reason')} placeholder="Supplier delivery" />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mut.isPending || projected < 0}>
              {mut.isPending && <Spinner className="mr-2" />} Adjust
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
