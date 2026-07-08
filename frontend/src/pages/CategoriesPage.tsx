import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RetryError } from '@/components/common/RetryError';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { extractApiError } from '@/lib/api';
import type { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Max 60 characters'),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const { data, isLoading, isError, error, refetch } = useCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '' });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    form.reset({ name: c.name });
    setDialogOpen(true);
  };

  const onSubmit = form.handleSubmit(async ({ name }) => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, name });
        toast.success('Category updated');
      } else {
        await createMut.mutateAsync(name);
        toast.success('Category created');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  });

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      toast.success('Category deleted');
      setPendingDelete(null);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products so cashiers find them faster at POS."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : isError ? (
        <RetryError error={error} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add your first category to start organising products."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => {
                const count = c._count?.products ?? 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={count > 0 ? 'secondary' : 'muted'}>{count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(c)}
                          disabled={count > 0}
                          title={count > 0 ? 'Reassign products first' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Rename Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Updating the name regenerates its slug.'
                : 'Slug is generated automatically from the name.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoFocus {...form.register('name')} placeholder="Beverages" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) && <Spinner className="mr-2" />}
                {editing ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This category will be removed permanently."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
