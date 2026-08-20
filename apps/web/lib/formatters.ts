export function formatRelativeDate(value?: number | string | null) {
  if (!value) return 'Unknown';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ${diff < 0 ? 'ago' : 'from now'}`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ${diff < 0 ? 'ago' : 'from now'}`;

  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ${diff < 0 ? 'ago' : 'from now'}`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date);
}

export function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

