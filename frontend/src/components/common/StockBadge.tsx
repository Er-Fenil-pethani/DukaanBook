import { Badge } from '@/components/ui/badge';

interface StockBadgeProps {
  stock: number;
  threshold: number;
}

export function StockBadge({ stock, threshold }: StockBadgeProps) {
  if (stock <= 0) {
    return <Badge variant="destructive">Out of stock</Badge>;
  }
  if (stock <= threshold) {
    return <Badge variant="warning">Low — {stock} left</Badge>;
  }
  return <Badge variant="success">{stock} in stock</Badge>;
}
