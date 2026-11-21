const DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Jan 5, 2026" from an ISO timestamp (UTC, so the label never shifts by time zone). */
export function formatDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso : DATE.format(t);
}

export const shortVersion = (v: string) => v.slice(0, 7);
export const n = (x: number) => x.toLocaleString('en-US');
