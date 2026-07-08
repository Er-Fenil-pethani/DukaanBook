import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { RetryError } from '@/components/common/RetryError';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StockAdjustDialog } from '@/components/common/StockAdjustDialog';
import { StockBadge } from '@/components/common/StockBadge';
import { ProductForm, type ProductFormValues } from '@/components/common/ProductForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  useDeleteProduct,
  useProduct,
  useUpdateProduct,
} from '@/hooks/useProducts';
import { extractApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useProduct(id);
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();

  const [tab, setTab] = useState('details');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onSubmit = async (values: ProductFormValues, file: File | null) => {
    if (!id) return;
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (k === 'stock') return; // stock changes via adjust modal only
        if (v === undefined || v === null) return;
        fd.append(k, String(v));
      });
      if (file) fd.append('image', file);
      await updateMut.mutateAsync({ id, formData: fd });
      toast.success('Saved');
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const onDelete = async () => {
    if (!id) return;
    try {
      const res = await deleteMut.mutateAsync(id);
      toast.success(res.deleted ? 'Product deleted' : 'Deactivated (had sale references)');
      navigate('/products');
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Product" description="Loading…" />
        <Skeleton className="h-96" />
      </>
    );
  }
  if (isError) return <RetryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title={data.name}
        description={
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs">{data.sku}</span>
            <StockBadge stock={data.stock} threshold={data.lowStockThreshold} />
            {!data.active && <Badge variant="muted">Inactive</Badge>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/products">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Link>
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>
              <PackageCheck className="h-4 w-4 mr-2" /> Adjust Stock
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="history">Stock history</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ProductForm
            mode="edit"
            existing={data}
            defaultValues={{
              sku: data.sku,
              barcode: data.barcode ?? '',
              name: data.name,
              description: data.description ?? '',
              price: Number(data.price),
              costPrice: Number(data.costPrice),
              stock: data.stock,
              lowStockThreshold: data.lowStockThreshold,
              categoryId: data.categoryId,
              active: data.active,
            }}
            submitLabel="Save changes"
            submitting={updateMut.isPending}
            onSubmit={onSubmit}
          />
          <div className="mt-8 border-t pt-6 flex justify-end">
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete Product
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          {data.stockMovements.length === 0 ? (
            <div className="border rounded-lg p-12 text-center text-sm text-muted-foreground">
              No stock movements yet.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.stockMovements.map((m) => {
                    const positive = m.quantity > 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(m.createdAt, 'long')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={positive ? 'success' : 'warning'}>{m.type}</Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${positive ? 'text-emerald-700' : 'text-amber-700'}`}
                        >
                          {positive ? `+${m.quantity}` : m.quantity}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.reason}</div>
                          {m.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{m.notes}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {m.actor.name}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {id && (
        <StockAdjustDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          productId={id}
          productName={data.name}
          currentStock={data.stock}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete "${data.name}"?`}
        description="If any sales reference this product, it will be deactivated instead of permanently removed."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
