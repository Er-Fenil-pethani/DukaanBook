import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ProductForm, type ProductFormValues } from '@/components/common/ProductForm';
import { Button } from '@/components/ui/button';
import { useCreateProduct } from '@/hooks/useProducts';
import { extractApiError } from '@/lib/api';

export default function ProductNewPage() {
  const navigate = useNavigate();
  const createMut = useCreateProduct();

  const onSubmit = async (values: ProductFormValues, file: File | null) => {
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        fd.append(k, String(v));
      });
      if (file) fd.append('image', file);
      const product = await createMut.mutateAsync(fd);
      toast.success(`Created "${product.name}"`);
      navigate(`/products/${product.id}`);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <>
      <PageHeader
        title="New Product"
        description="Add an item to your catalogue."
        actions={
          <Button asChild variant="outline">
            <Link to="/products">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Link>
          </Button>
        }
      />
      <ProductForm
        mode="create"
        submitLabel="Create product"
        submitting={createMut.isPending}
        onSubmit={onSubmit}
      />
    </>
  );
}
