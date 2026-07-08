import { ImageIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { resolveAsset } from '@/lib/api';
import type { PosProduct } from '@/hooks/usePosSearch';

interface PosProductCardProps {
  product: PosProduct;
  currency: string;
  onAdd: () => void;
}

export function PosProductCard({ product, currency, onAdd }: PosProductCardProps) {
  const outOfStock = product.stock <= 0;
  const low = !outOfStock && product.stock <= product.lowStockThreshold;
  const image = resolveAsset(product.imageUrl);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={outOfStock}
      className={cn(
        'group relative flex flex-col rounded-xl border border-border bg-card text-left overflow-hidden transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        outOfStock
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 active:translate-y-0 active:scale-[0.99]'
      )}
    >
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
        )}
        {!outOfStock && (
          <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 min-h-[88px]">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{product.name}</p>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{product.sku}</p>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="font-semibold text-sm tabular-nums">
            {formatCurrency(product.price, currency)}
          </span>
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ring-inset',
              outOfStock
                ? 'bg-destructive/15 text-destructive ring-destructive/25'
                : low
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/25'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/25'
            )}
          >
            {outOfStock ? 'Out' : `${product.stock} left`}
          </span>
        </div>
      </div>
    </button>
  );
}
