import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Package, ImageIcon, X, Filter } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { RetryError } from '@/components/common/RetryError';
import { Pagination } from '@/components/common/Pagination';
import { StockBadge } from '@/components/common/StockBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { useCurrency } from '@/stores/businessStore';
import { formatCurrency } from '@/lib/format';
import { resolveAsset } from '@/lib/api';
import { cn } from '@/lib/utils';

const ALL = '__all__';

type Status = 'any' | 'active' | 'inactive' | 'lowStock';

const statusFilters: { value: Status; label: string }[] = [
  { value: 'any', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lowStock', label: 'Low stock' },
];

export default function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const [status, setStatus] = useState<Status>('any');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const currency = useCurrency();

  const { data: categories } = useCategories();
  const params = {
    search: debouncedSearch || undefined,
    categoryId: categoryId === ALL ? undefined : categoryId,
    active: status === 'active' ? true : status === 'inactive' ? false : undefined,
    lowStock: status === 'lowStock' ? true : undefined,
    page,
    pageSize,
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useProducts(params);

  const reset = () => {
    setSearch('');
    setCategoryId(ALL);
    setStatus('any');
    setPage(1);
  };

  const products = data?.products ?? [];
  const hasFilters = !!debouncedSearch || categoryId !== ALL || status !== 'any';

  return (
    <>
      <PageHeader
        title="Products"
        description="Catalogue, pricing, and stock for every item you sell."
        actions={
          <Button asChild>
            <Link to="/products/new">
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Link>
          </Button>
        }
      />

      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, SKU or barcode…"
              className="pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="h-4 w-4 mr-1" /> Reset
            </Button>
          )}
        </div>

        {/* status chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium pr-1">
            <Filter className="h-3 w-3" /> Status
          </span>
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                status === f.value
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* category chips */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium pr-1">
              <Filter className="h-3 w-3" /> Category
            </span>
            <button
              type="button"
              onClick={() => {
                setCategoryId(ALL);
                setPage(1);
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                categoryId === ALL
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/50 text-muted-foreground hover:text-foreground'
              )}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id);
                  setPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                  categoryId === c.id
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border bg-card hover:border-foreground/20 hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-border last:border-0">
              <Skeleton className="h-12 w-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <RetryError error={error} onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? 'No products match' : 'No products yet'}
          description={
            hasFilters
              ? 'Try adjusting filters or resetting them.'
              : 'Add your first product to start selling.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                Reset filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/products/new">
                  <Plus className="h-4 w-4 mr-2" /> Add Product
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div
            className={cn(
              'rounded-xl border border-border bg-card overflow-hidden transition-opacity',
              isFetching && 'opacity-90'
            )}
          >
            <div className="hidden md:grid grid-cols-[60px_2.5fr_1fr_1fr_1fr_140px_90px] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              <div />
              <div>Name</div>
              <div>SKU</div>
              <div>Category</div>
              <div className="text-right">Price</div>
              <div>Stock</div>
              <div>Status</div>
            </div>
            {products.map((p) => {
              const imageSrc = resolveAsset(p.imageUrl);
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/products/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/products/${p.id}`);
                  }}
                  className="md:grid md:grid-cols-[60px_2.5fr_1fr_1fr_1fr_140px_90px] gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-accent/40 transition-colors cursor-pointer items-center"
                >
                  <div className="h-11 w-11 rounded-md bg-muted overflow-hidden flex items-center justify-center ring-1 ring-inset ring-border">
                    {imageSrc ? (
                      <img src={imageSrc} alt={p.name} className="object-cover w-full h-full" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">{p.sku}</div>
                  <div className="text-muted-foreground text-sm truncate">
                    {p.category?.name ?? '—'}
                  </div>
                  <div className="md:text-right font-semibold tabular-nums">
                    {formatCurrency(p.price, currency)}
                  </div>
                  <div>
                    <StockBadge stock={p.stock} threshold={p.lowStockThreshold} />
                  </div>
                  <div>
                    {p.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="muted">Inactive</Badge>
                    )}
                  </div>
                </div>
              );
            })}
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
