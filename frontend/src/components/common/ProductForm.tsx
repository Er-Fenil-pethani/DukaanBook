import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCategories } from '@/hooks/useCategories';
import { resolveAsset } from '@/lib/api';
import type { Product } from '@/types';

export const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  barcode: z.string().max(60).optional(),
  name: z.string().trim().min(1, 'Name is required').max(160),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().nonnegative('Must be ≥ 0'),
  costPrice: z.coerce.number().nonnegative('Must be ≥ 0'),
  stock: z.coerce.number().int().nonnegative('Must be ≥ 0').default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(10),
  categoryId: z.string().uuid('Pick a category'),
  active: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<ProductFormValues>;
  existing?: Product;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ProductFormValues, file: File | null) => Promise<void> | void;
}

export function ProductForm({
  mode,
  defaultValues,
  existing,
  submitLabel,
  submitting,
  onSubmit,
}: ProductFormProps) {
  const { data: categories } = useCategories();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      barcode: '',
      name: '',
      description: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      lowStockThreshold: 10,
      categoryId: '',
      active: true,
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) form.reset({ ...form.getValues(), ...defaultValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues?.sku, defaultValues?.name]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = form.handleSubmit((values) => onSubmit(values, file));

  const currentImage = preview ?? resolveAsset(existing?.imageUrl);

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...form.register('sku')} placeholder="BEV-001" />
            {form.formState.errors.sku && (
              <p className="text-xs text-destructive">{form.formState.errors.sku.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input id="barcode" {...form.register('barcode')} placeholder="Optional" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" rows={3} {...form.register('description')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <Select
            value={form.watch('categoryId')}
            onValueChange={(v) => form.setValue('categoryId', v, { shouldDirty: true, shouldValidate: true })}
          >
            <SelectTrigger id="categoryId">
              <SelectValue placeholder="Pick a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.categoryId && (
            <p className="text-xs text-destructive">
              {form.formState.errors.categoryId.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Selling price</Label>
            <Input id="price" type="number" step="0.01" min="0" {...form.register('price')} />
            {form.formState.errors.price && (
              <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost price</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              {...form.register('costPrice')}
            />
            {form.formState.errors.costPrice && (
              <p className="text-xs text-destructive">
                {form.formState.errors.costPrice.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="stock">Initial stock</Label>
              <Input id="stock" type="number" min="0" {...form.register('stock')} />
              <p className="text-xs text-muted-foreground">
                Use stock adjustments later for changes.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low-stock alert at</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min="0"
              {...form.register('lowStockThreshold')}
            />
          </div>
        </div>

        {mode === 'edit' && (
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.watch('active')}
              onChange={(e) => form.setValue('active', e.target.checked, { shouldDirty: true })}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active (available at POS)
            </Label>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner className="mr-2" />}
            {submitLabel}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Image</Label>
        <div className="aspect-square rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
          {currentImage ? (
            <img src={currentImage} alt="Preview" className="object-cover w-full h-full" />
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFile}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentImage ? 'Replace image' : 'Upload image'}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPEG / PNG / WebP up to 5MB. Resized to 800px wide.
        </p>
      </div>
    </form>
  );
}
