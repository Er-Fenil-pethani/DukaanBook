import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, ShoppingCart, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RetryError } from '@/components/common/RetryError';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { Pagination } from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useSales } from '@/hooks/useSales';
import { useStaff } from '@/hooks/useStaff';
import { useAuth } from '@/stores/authStore';
import { useCurrency } from '@/stores/businessStore';
import { formatCurrency, formatDate } from '@/lib/format';

const ALL = '__all__';

export default function SalesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currency = useCurrency();
  const isOwner = user?.role === 'OWNER';

  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [cashierId, setCashierId] = useState<string>(ALL);
  const [paymentMethod, setPaymentMethod] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: staff } = useStaff({ enabled: isOwner });

  const params = {
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    cashierId: cashierId === ALL ? undefined : cashierId,
    paymentMethod: paymentMethod === ALL ? undefined : (paymentMethod as 'CASH' | 'CARD'),
    status: status === ALL ? undefined : (status as 'COMPLETED' | 'REFUNDED'),
    page,
    pageSize,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useSales(params);
  const sales = data?.sales ?? [];
  const hasFilters =
    !!from || !!to || cashierId !== ALL || paymentMethod !== ALL || status !== ALL;

  const reset = () => {
    setFrom('');
    setTo('');
    setCashierId(ALL);
    setPaymentMethod(ALL);
    setStatus(ALL);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Sales"
        description={isOwner ? 'Every sale across the shop.' : 'Your sales today and earlier.'}
      />

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
        {isOwner && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Cashier</label>
            <Select
              value={cashierId}
              onValueChange={(v) => {
                setCashierId(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any cashier</SelectItem>
                {staff?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Payment</label>
          <Select
            value={paymentMethod}
            onValueChange={(v) => {
              setPaymentMethod(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CARD">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} columns={7} />
      ) : isError ? (
        <RetryError error={error} onRetry={() => refetch()} />
      ) : sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasFilters ? 'No sales match these filters' : 'No sales recorded yet'}
          description={
            hasFilters
              ? 'Try clearing filters or widening the date range.'
              : 'Sales will appear here once you make your first transaction.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Reset filters
              </Button>
            ) : (
              <Button onClick={() => navigate('/pos')}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Open POS Counter
              </Button>
            )
          }
        />
      ) : (
        <>
          <div
            className={`rounded-xl border border-border bg-card overflow-hidden transition-opacity ${
              isFetching ? 'opacity-90' : ''
            }`}
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Sale #</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/sales/${s.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{s.saleNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(s.createdAt, 'long')}
                    </TableCell>
                    <TableCell>{s.cashier?.name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.items.length}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(s.total, currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.paymentMethod === 'CASH' ? 'secondary' : 'outline'}>
                        {s.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.status === 'COMPLETED' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="destructive">Refunded</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data?.page ?? 1}
            pageSize={data?.pageSize ?? pageSize}
            total={data?.total ?? 0}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
