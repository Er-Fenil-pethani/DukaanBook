import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-dashed border-border bg-card/40',
        className
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full" aria-hidden />
        <div className="relative h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-inset ring-primary/20">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
