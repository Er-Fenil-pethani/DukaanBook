import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ImageIcon, Save, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { RetryError } from '@/components/common/RetryError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBusinessProfile, useUpdateBusiness, useUploadLogo } from '@/hooks/useBusiness';
import { extractApiError, resolveAsset } from '@/lib/api';

const businessSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  address: z.string().max(500).optional(),
  phone: z.string().max(30).optional(),
  currency: z.string().min(1).max(8),
  taxRate: z.coerce.number().min(0).max(100),
});
type BusinessValues = z.infer<typeof businessSchema>;

const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'INR'];

export default function BusinessPage() {
  const { data, isLoading, isError, error, refetch } = useBusinessProfile();
  const updateMut = useUpdateBusiness();
  const uploadMut = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      currency: 'PKR',
      taxRate: 0,
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name,
        address: data.address ?? '',
        phone: data.phone ?? '',
        currency: data.currency,
        taxRate: Number(data.taxRate),
      });
    }
  }, [data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMut.mutateAsync({
        name: values.name,
        address: values.address || null,
        phone: values.phone || null,
        currency: values.currency,
        taxRate: values.taxRate,
      });
      toast.success('Business settings saved');
    } catch (err) {
      toast.error(extractApiError(err));
    }
  });

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    try {
      await uploadMut.mutateAsync(file);
      toast.success('Logo updated');
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Business Settings" description="Loading…" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  if (isError) return <RetryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const currentLogo = previewUrl ?? resolveAsset(data.logoUrl);

  return (
    <>
      <PageHeader
        title="Business Settings"
        description="These details appear on receipts and POS headers."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Business name</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={form.watch('currency')}
                    onValueChange={(v) => form.setValue('currency', v, { shouldDirty: true })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" rows={3} {...form.register('address')} />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...form.register('taxRate')}
                />
                {form.formState.errors.taxRate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.taxRate.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Applied automatically to every sale's subtotal.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={updateMut.isPending || !form.formState.isDirty}>
                  {updateMut.isPending && <Spinner className="mr-2" />}
                  <Save className="h-4 w-4 mr-2" /> Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="object-contain w-full h-full" />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onLogoChange}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMut.isPending}
            >
              {uploadMut.isPending ? <Spinner className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploadMut.isPending ? 'Uploading…' : 'Replace logo'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              JPEG / PNG / WebP up to 5MB. Resized to 400px max width.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
