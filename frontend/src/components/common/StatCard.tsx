import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Intent = 'default' | 'success' | 'warning' | 'destructive';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  intent?: Intent;
  hint?: string;
  trend?: { label: string; positive?: boolean };
  onClick?: () => void;
  className?: string;
}

const intentStyles: Record<Intent, string> = {
  default: 'bg-primary/10 text-primary ring-primary/20',
  success: 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-500 ring-amber-500/20 dark:text-amber-400',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/20',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  intent = 'default',
  hint,
  trend,
  onClick,
  className,
}: StatCardProps) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'glass-card group relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10',
        interactive &&
          'cursor-pointer hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {title}
          </p>
          <p className="text-2xl font-semibold mt-2 tabular-nums tracking-tight truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium',
                trend.positive ? 'text-emerald-500' : 'text-destructive'
              )}
            >
              {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            'shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ring-1 ring-inset transition-transform group-hover:scale-110',
            intentStyles[intent]
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
