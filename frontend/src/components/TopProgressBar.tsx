import { useEffect, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function TopProgressBar() {
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const active = fetching + mutating > 0;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let tick: ReturnType<typeof setInterval> | undefined;

    if (active) {
      showTimer = setTimeout(() => {
        setVisible(true);
        setProgress(15);
        tick = setInterval(() => {
          setProgress((p) => (p < 90 ? p + Math.max(1, (90 - p) * 0.08) : p));
        }, 150);
      }, 150);
    } else {
      setProgress(100);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (tick) clearInterval(tick);
    };
  }, [active]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent pointer-events-none"
      role="progressbar"
      aria-hidden={!visible}
    >
      <div
        className={cn(
          'h-full bg-primary transition-[width,opacity] duration-200 ease-out',
          'shadow-[0_0_10px_hsl(160_84%_39%/0.7)]',
          !visible && 'opacity-0'
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
