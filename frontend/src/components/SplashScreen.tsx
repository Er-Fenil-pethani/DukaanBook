import { Store } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="h-14 w-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
        <Store className="h-7 w-7" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading session…
      </div>
    </div>
  );
}
