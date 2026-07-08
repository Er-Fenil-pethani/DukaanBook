import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Users, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
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
  useCreateStaff,
  useDeleteStaff,
  useStaff,
  useToggleSuspend,
  type StaffMember,
} from '@/hooks/useStaff';
import { extractApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';

const newStaffSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().email('Invalid email').max(160),
  password: z.string().min(8, 'Minimum 8 characters').max(128),
});
type NewStaffValues = z.infer<typeof newStaffSchema>;

export default function StaffPage() {
  const { data, isLoading, isError, error, refetch } = useStaff();
  const createMut = useCreateStaff();
  const toggleMut = useToggleSuspend();
  const deleteMut = useDeleteStaff();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StaffMember | null>(null);

  const form = useForm<NewStaffValues>({
    resolver: zodResolver(newStaffSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMut.mutateAsync(values);
      toast.success(`Created cashier ${values.email}`);
      setDialogOpen(false);
      form.reset();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  });

  const onToggle = async (s: StaffMember) => {
    try {
      await toggleMut.mutateAsync({ id: s.id, suspended: s.suspended });
      toast.success(s.suspended ? `${s.name} unsuspended` : `${s.name} suspended`);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await deleteMut.mutateAsync(pendingDelete.id);
      toast.success(
        res.deleted ? 'Cashier deleted' : 'Cashier suspended (sales history retained)'
      );
      setPendingDelete(null);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        description="Manage cashiers who can sign in to the POS counter."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Cashier
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={5} />
      ) : isError ? (
        <RetryError error={error} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No cashiers yet"
          description="Add cashiers so they can sign in and process sales."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Cashier
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold ring-1 ring-primary/25 shrink-0">
                        {s.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email}</TableCell>
                  <TableCell>
                    {s.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(s.createdAt, 'short')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggle(s)}
                        disabled={toggleMut.isPending}
                        title={s.suspended ? 'Unsuspend' : 'Suspend'}
                      >
                        {s.suspended ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-amber-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(s)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cashier</DialogTitle>
            <DialogDescription>
              They'll be able to sign in immediately and process sales at the POS counter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoFocus {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Spinner className="mr-2" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="If this cashier has past sales, they'll be suspended instead so history is preserved."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={onDelete}
      />
    </>
  );
}
