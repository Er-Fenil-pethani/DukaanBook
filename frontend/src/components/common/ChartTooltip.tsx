import type { TooltipProps } from 'recharts';

interface ChartTooltipProps extends TooltipProps<number, string> {
  formatValue?: (v: number, key: string) => string;
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({ active, payload, label, formatValue, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm px-3 py-2 shadow-lg text-xs">
      {label != null && (
        <p className="font-medium text-foreground mb-1">
          {labelFormatter ? labelFormatter(String(label)) : String(label)}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => {
          const key = String(p.dataKey ?? p.name ?? '');
          const value = Number(p.value ?? 0);
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color ?? 'currentColor' }}
              />
              <span className="text-muted-foreground capitalize">{key}:</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatValue ? formatValue(value, key) : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
