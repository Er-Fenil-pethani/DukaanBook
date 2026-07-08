import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  X,
  ShoppingCart,
  Printer,
  CreditCard,
  Banknote,
  PackageX,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePosSearch } from '@/hooks/usePosSearch';
import { useCreateSale } from '@/hooks/useSales';
import { useCart } from '@/stores/cartStore';
import { useAuth } from '@/stores/authStore';
import { useBusiness, useCurrency, useTaxRate } from '@/stores/businessStore';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { extractApiError } from '@/lib/api';
import { PosProductCard } from '@/pages/pos/PosProductCard';
import { PosReceipt } from '@/pages/pos/PosReceipt';
import type { Sale } from '@/types';

export default function PosPage() {
  const { user } = useAuth();
  const currency = useCurrency();
  const taxRate = useTaxRate();
  const business = useBusiness((s) => s.business);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 200);
  const search = usePosSearch(debouncedQuery, 36);

  const cart = useCart();
  const [payment, setPayment] = useState<'CASH' | 'CARD'>('CASH');
  const [pulse, setPulse] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  const createSale = useCreateSale();
  const searchRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ignore when focus is in an input/textarea (except the search)
      const target = e.target as HTMLElement;
      const isFormField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '/' && !isFormField) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
      } else if (e.key === 'Enter' && document.activeElement === searchRef.current) {
        const first = search.data?.[0];
        if (first) {
          handleAdd(first);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);

  const subtotal = useMemo(
    () => cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart.items]
  );
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = subtotal + taxAmount;

  const handleAdd = (p: {
    id: string;
    sku: string;
    name: string;
    price: string | number;
    stock: number;
    imageUrl?: string | null;
  }) => {
    const result = cart.addOrIncrement({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      price: Number(p.price),
      stock: p.stock,
      imageUrl: p.imageUrl,
    });
    if (result === 'capped') {
      toast.error(`No more "${p.name}" in stock (${p.stock} available)`);
    } else {
      setPulse(true);
      setTimeout(() => setPulse(false), 250);
    }
  };

  const handleComplete = async () => {
    if (cart.items.length === 0) return;
    try {
      const sale = await createSale.mutateAsync({
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: payment,
      });
      cart.clear();
      setReceiptSale(sale);
      toast.success(`Sale ${sale.saleNumber} complete`);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const today = formatDate(time, 'short');
  const now = formatDate(time, 'time');

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Left pane — search + grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-card/60 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/25 shrink-0">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold leading-tight truncate">
                {business?.name ?? 'POS Counter'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.name} · {today} · <span className="tabular-nums">{now}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 pb-3 bg-card/40 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU or barcode…"
              className="pl-10 pr-10 h-11 text-base bg-background"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                /
              </kbd>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            <kbd className="px-1 rounded bg-muted text-foreground font-mono">/</kbd> focus ·{' '}
            <kbd className="px-1 rounded bg-muted text-foreground font-mono">Enter</kbd> add first result ·{' '}
            <kbd className="px-1 rounded bg-muted text-foreground font-mono">Esc</kbd> clear
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {search.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : (search.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={PackageX}
              title="No products match"
              description={
                query
                  ? `No active products contain "${query}". Try a different keyword.`
                  : 'No active products in your catalogue.'
              }
              action={
                query ? (
                  <Button variant="outline" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {search.data!.map((p) => (
                <PosProductCard
                  key={p.id}
                  product={p}
                  currency={currency}
                  onAdd={() => handleAdd(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right pane — cart */}
      <aside className="w-[400px] shrink-0 bg-card border-l border-border flex flex-col">
        <div
          className={cn(
            'px-5 py-3.5 border-b border-border flex items-center justify-between transition-colors duration-300',
            pulse && 'bg-primary/10'
          )}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Current Sale</h2>
          </div>
          <Badge variant={cart.items.length ? 'default' : 'muted'}>
            {cart.items.length} item{cart.items.length === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <ShoppingCart className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                Click a product on the left to start a new sale.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cart.items.map((item) => {
                const lineTotal = item.price * item.quantity;
                return (
                  <li key={item.productId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {formatCurrency(item.price, currency)} · stock {item.stock}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">
                        {formatCurrency(lineTotal, currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="inline-flex items-center rounded-md border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => cart.dec(item.productId)}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-l-md transition-colors"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => cart.setQty(item.productId, Number(e.target.value))}
                          className="h-7 w-12 text-center text-sm bg-transparent border-x border-border focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => cart.inc(item.productId)}
                          disabled={item.quantity >= item.stock}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-r-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(item.productId)}
                        className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 space-y-3 bg-card">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax <span className="font-mono text-xs">({taxRate}%)</span>
              </span>
              <span className="font-medium tabular-nums">{formatCurrency(taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-base pt-2 mt-1 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tabular-nums text-primary">
                {formatCurrency(total, currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayment('CASH')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                payment === 'CASH'
                  ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <Banknote className="h-4 w-4" /> Cash
            </button>
            <button
              type="button"
              onClick={() => setPayment('CARD')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-all duration-200',
                payment === 'CARD'
                  ? 'border-primary bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <CreditCard className="h-4 w-4" /> Card
            </button>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
            onClick={handleComplete}
            disabled={cart.items.length === 0 || createSale.isPending}
          >
            {createSale.isPending ? (
              <>
                <Spinner className="mr-2" /> Processing…
              </>
            ) : (
              <>
                Complete Sale ·{' '}
                <span className="font-mono ml-1">{formatCurrency(total, currency)}</span>
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setClearOpen(true)}
            disabled={cart.items.length === 0}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground block mx-auto"
          >
            Clear cart
          </button>
        </div>
      </aside>

      {/* Receipt modal */}
      <Dialog
        open={!!receiptSale}
        onOpenChange={(v) => {
          if (!v) setReceiptSale(null);
        }}
      >
        <DialogContent className="max-w-sm receipt-modal border-t-2 border-t-primary">
          <DialogHeader className="no-print">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
                <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="text-left">
                <DialogTitle>Sale complete</DialogTitle>
                {receiptSale && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {receiptSale.saleNumber}
                  </p>
                )}
              </div>
            </div>
          </DialogHeader>
          {receiptSale && (
            <>
              <PosReceipt ref={receiptRef} sale={receiptSale} currency={currency} />
              <div className="flex gap-2 pt-2 no-print">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button className="flex-1" onClick={() => setReceiptSale(null)}>
                  New Sale
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Clear cart?"
        description="All items will be removed."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          cart.clear();
          setClearOpen(false);
        }}
      />
    </div>
  );
}
