import type { UpdateResult } from '@/core';

export { relativeTime, plural } from '@/ui/data/syncFormat';
export { describeError, type SourceError, type SourceErrorKind } from '@/ui/data/syncErrors';

export function shortDate(iso: string | undefined): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function describeUpdate(r: UpdateResult | undefined): { tone: 'ok' | 'warn' | 'none'; text: string } {
  if (!r) return { tone: 'none', text: 'No check has run yet' };
  switch (r.status) {
    case 'up-to-date':
      return { tone: 'ok', text: 'Up to date' };
    case 'updated':
      return { tone: 'ok', text: `Updated to ${r.version}` };
    case 'rejected':
      return { tone: 'warn', text: `Update rejected: ${r.message}` };
    default:
      return { tone: 'warn', text: `Couldn't check for updates: ${r.message}` };
  }
}
