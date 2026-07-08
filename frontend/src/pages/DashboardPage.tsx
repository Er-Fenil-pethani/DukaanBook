import { useNavigate, Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Coins,
  ShoppingBag,
  AlertTriangle,
  Boxes,
  ArrowRight,
  TrendingUp,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { RetryError } from '@/components/common/RetryError';
import { StatCard } from '@/components/common/StatCard';
import { ChartTooltip } from '@/components/common/ChartTooltip';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/hooks/useDashboard';
import { useCurrency } from '@/stores/businessStore';
import { formatCurrency, formatDate } from '@/lib/format';

export default function DashboardPage() {
  const navigate = useNavigate();
  const currency = useCurrency();
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </>
    );
  }
  if (isError) return <RetryError error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const noSales = data.todaySales === 0 && data.recentSales.length === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Overview as of ${formatDate(new Date(), 'long')}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(data.todayRevenue, currency)}
          icon={Coins}
        />
        <StatCard
          title="Today's Sales"
          value={String(data.todaySales)}
          icon={ShoppingBag}
          hint="Completed sales only"
        />
        <StatCard
          title="Low Stock"
          value={String(data.lowStockCount)}
          icon={AlertTriangle}
          intent={data.lowStockCount > 0 ? 'warning' : 'default'}
          hint="At or below threshold"
          onClick={() => navigate('/products?lowStock=true')}
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(data.stockValue, currency)}
          icon={Boxes}
          hint="Cost × stock"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Last 7 days revenue</h2>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {data.last7DaysChart[0]?.date} → {data.last7DaysChart.at(-1)?.date}
            </span>
          </div>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.last7DaysChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => formatDate(v, 'short').replace(', 2026', '')}
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
                  content={
                    <ChartTooltip
                      formatValue={(v) => formatCurrency(v, currency)}
                      labelFormatter={(l) => formatDate(l, 'short')}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Top 5 this month</h2>
            <p className="text-xs text-muted-foreground mt-0.5">By units sold</p>
          </div>
          <div className="p-4 h-72">
            {data.topProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No completed sales yet this month.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topProducts}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis
                    type="number"
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--accent) / 0.5)' }}
                    content={
                      <ChartTooltip
                        formatValue={(v, k) =>
                          k === 'quantity' ? `${v} sold` : formatCurrency(v, currency)
                        }
                      />
                    }
                  />
                  <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Recent sales</h2>
          </div>
          <Link
            to="/sales"
            className="text-xs text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {noSales ? (
          <EmptyState
            icon={Receipt}
            title="No sales recorded yet"
            description="Sales will appear here once you make your first transaction."
            action={
              <Button onClick={() => navigate('/pos')}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Open POS Counter
              </Button>
            }
            className="border-0 rounded-none"
          />
        ) : (
          <ul className="divide-y divide-border">
            {data.recentSales.map((s) => (
              <li
                key={s.id}
                onClick={() => navigate(`/sales/${s.id}`)}
                className="px-5 py-3 flex items-center gap-4 hover:bg-accent/40 transition-colors cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary/20">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-medium">{s.saleNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.cashier?.name ?? '—'} · {formatDate(s.createdAt, 'time')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(s.total, currency)}
                  </p>
                  {s.status === 'COMPLETED' ? (
                    <Badge variant="success" className="mt-0.5">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="mt-0.5">
                      Refunded
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
