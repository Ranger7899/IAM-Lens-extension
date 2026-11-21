import { AuthRequiredError, GcpApiError } from '@/core/gcp';
import type { UpdateResult } from '@/core';

export type SourceErrorKind = 'forbidden' | 'offline' | 'auth' | 'other';
export interface SourceError {
  kind: SourceErrorKind;
  message: string;
}

/** Turns a thrown fetch error into a short, friendly, actionable reason. `parent` is the source being fetched. */
export function describeError(e: unknown, parent?: string): SourceError {
  if (e instanceof AuthRequiredError) {
    return { kind: 'auth', message: 'Your Google session ended. Sign in again to refresh.' };
  }
  if (e instanceof GcpApiError) {
    if (e.status === 403) {
      if (e.reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(e.message)) {
        return {
          kind: 'forbidden',
          message:
            'A required Google API is turned off for this project. Enable the IAM and Resource Manager APIs.',
        };
      }
      if (e.reason.startsWith('missing iam.roles.list') && parent) {
        return {
          kind: 'forbidden',
          message: `Your account can't list custom roles on ${parent}. It needs iam.roles.list (for example the Role Viewer role).`,
        };
      }
      return {
        kind: 'forbidden',
        message:
          'Access denied. Your account needs resourcemanager.projects.get to list projects, or iam.roles.list to read their roles.',
      };
    }
    if (e.status === 404) return { kind: 'other', message: 'Not found. It may have been deleted.' };
    if (e.status === 429)
      return { kind: 'other', message: 'Google is rate limiting requests. Try again in a minute.' };
    return { kind: 'other', message: `Google returned an error (${e.status}). ${e.message}`.trim() };
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
