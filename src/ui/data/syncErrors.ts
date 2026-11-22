import {
  AuthRequiredError,
  classifyGcpError,
  friendlyGcpMessage,
  GcpApiError,
  ScopeUpgradeRequiredError,
} from '@/core/gcp';

export type SourceErrorKind = 'forbidden' | 'not-found' | 'offline' | 'auth' | 'scope' | 'other';
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
    if (e.status === 404) return { kind: 'not-found', message: 'Not found. It may have been deleted.' };
    if (e.status === 403) return { kind: 'forbidden', message: friendlyGcpMessage(e, parent) };
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
