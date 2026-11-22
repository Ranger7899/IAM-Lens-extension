import {
  AuthRequiredError,
  classifyGcpError,
  friendlyGcpMessage,
  GcpApiError,
  ScopeUpgradeRequiredError,
} from '@/core/gcp';
import type { UpdateResult } from '@/core';

export type SourceErrorKind = 'forbidden' | 'offline' | 'auth' | 'scope' | 'other';
export interface SourceError {
  kind: SourceErrorKind;
  message: string;
}

/** Turns a thrown fetch error into a short, friendly, actionable reason. `parent` is the source being fetched. */
export function describeError(e: unknown, parent?: string): SourceError {
  if (e instanceof ScopeUpgradeRequiredError) {
    return { kind: 'scope', message: 'Sign in again to grant the new permission.' };
  }
  if (e instanceof AuthRequiredError) {
    return { kind: 'auth', message: 'Your Google session ended. Sign in again to refresh.' };
  }
  if (e instanceof GcpApiError) {
    const kind = classifyGcpError(e);
    if (kind === 'scope') return { kind: 'scope', message: friendlyGcpMessage(e, parent) };
    if (kind === 'service-disabled' || kind === 'permission') {
      return { kind: 'forbidden', message: friendlyGcpMessage(e, parent) };
    }
    if (e.status === 404) return { kind: 'other', message: 'Not found. It may have been deleted.' };
    if (e.status === 429)
      return { kind: 'other', message: 'Google is rate limiting requests. Try again in a minute.' };
    return { kind: 'other', message: friendlyGcpMessage(e, parent) };
  }
  if (e instanceof TypeError) {
    return {
      kind: 'offline',
      message: "You're offline or Google can't be reached. Cached roles still work.",
    };
  }
  return { kind: 'other', message: e instanceof Error ? e.message : String(e) };
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "3 minutes ago", "just now"; falls back to the ISO string if it can't be parsed. */
export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return 'never';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = t - now;
  if (Math.abs(diff) < 60_000) return 'just now';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'just now';
}

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

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString('en')} ${n === 1 ? one : many}`;
}
