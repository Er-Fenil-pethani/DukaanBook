import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RetryErrorProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

export function RetryError({ error, onRetry, className }: RetryErrorProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center',
        className
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4 ring-1 ring-inset ring-destructive/20">
        <AlertCircle className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tight">Couldn't load this</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-md break-words leading-relaxed">
        {extractApiError(error)}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-5">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  );
}
