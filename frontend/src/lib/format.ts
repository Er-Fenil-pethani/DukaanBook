type DateFmt = 'short' | 'long' | 'time' | 'relative';

export function formatCurrency(value: number | string, currency = 'PKR'): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!isFinite(n)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatDate(value: string | Date | null | undefined, format: DateFmt = 'short'): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';

  if (format === 'relative') return relativeFromNow(d);
  if (format === 'time') {
    return new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(d);
  }
  if (format === 'short') {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function relativeFromNow(d: Date): string {
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  const m = 60_000;
  const h = 60 * m;
  const day = 24 * h;
  if (abs < m) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (abs < h) return rtf.format(Math.round(diffMs / m), 'minute');
  if (abs < day) return rtf.format(Math.round(diffMs / h), 'hour');
  if (abs < 7 * day) return rtf.format(Math.round(diffMs / day), 'day');
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
}
