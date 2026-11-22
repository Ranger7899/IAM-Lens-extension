/**
 * Receives the OAuth result from the own-domain callback page (`site/auth/callback.html`, IAM-79) through
 * `externally_connectable` messaging. Strict by design: wrong origin, path, type, shape or state is ignored.
 * Tokens are never logged.
 */
import { browser } from 'wxt/browser';
import {
  AUTH_RESULT_KEY,
  AUTH_STORAGE_KEY,
  OAUTH_MESSAGE_TYPE,
  OAUTH_SCOPE,
  WEB_AUTH_CALLBACK_PATH,
  WEB_AUTH_ORIGIN,
} from '../core/gcp/authConfig';
import { consumePendingState, type StoredAuth, type WebAuthResult } from '../core/gcp/auth';

const MAX_TOKEN_LENGTH = 4096;
const MAX_EXPIRES_IN_S = 24 * 3600;

type Parsed =
  | { kind: 'token'; token: string; expiresInS: number; scope: string; state: string }
  | { kind: 'error'; error: string; state: string };

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined;

/** Sender must be our callback page: exact origin and path. */
export function isTrustedSender(sender: { origin?: string; url?: string } | undefined): boolean {
  if (!sender || sender.origin !== WEB_AUTH_ORIGIN || typeof sender.url !== 'string') return false;
  try {
    const u = new URL(sender.url);
    return u.origin === WEB_AUTH_ORIGIN && u.pathname === WEB_AUTH_CALLBACK_PATH;
  } catch {
    return false;
  }
}

/** Shape-checks the message; returns `undefined` for anything unexpected. Does not check `state` freshness. */
export function parseOAuthMessage(message: unknown): Parsed | undefined {
  if (typeof message !== 'object' || message === null) return undefined;
  const m = message as { type?: unknown; params?: unknown };
  if (m.type !== OAUTH_MESSAGE_TYPE || typeof m.params !== 'object' || m.params === null) return undefined;
  const p = m.params as Record<string, unknown>;
  const state = str(p.state, 256);
  if (!state) return undefined;
  const error = str(p.error, 200);
  if (error) return { kind: 'error', error, state };
  const token = str(p.access_token, MAX_TOKEN_LENGTH);
  const scope = str(p.scope, 2000);
  const expiresIn =
    typeof p.expires_in === 'string' && /^\d{1,7}$/.test(p.expires_in) ? Number(p.expires_in) : NaN;
  if (!token || !scope || !(expiresIn > 0)) return undefined;
  return { kind: 'token', token, scope, expiresInS: Math.min(expiresIn, MAX_EXPIRES_IN_S), state };
}

// Serialises messages so a state cannot be consumed twice by concurrent deliveries.
let chain: Promise<unknown> = Promise.resolve();

/** Validates and applies one external message. Resolves to true when a sign-in was recorded. */
export function handleOAuthMessage(
  message: unknown,
  sender: { origin?: string; url?: string; tab?: { id?: number } } | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  const run = async (): Promise<boolean> => {
    if (!isTrustedSender(sender)) return false;
    const parsed = parseOAuthMessage(message);
    if (!parsed) return false;
    if (!(await consumePendingState(parsed.state, now))) return false;
    let result: WebAuthResult;
    if (parsed.kind === 'token') {
      const auth: StoredAuth = {
        token: parsed.token,
        expiresAt: now + parsed.expiresInS * 1000,
        scope: parsed.scope || OAUTH_SCOPE,
        method: 'web',
      };
      await browser.storage.session.set({ [AUTH_STORAGE_KEY]: auth });
      result = { state: parsed.state, ok: true };
    } else {
      result = { state: parsed.state, ok: false, error: `Google sign-in failed: ${parsed.error}` };
    }
    await browser.storage.session.set({ [AUTH_RESULT_KEY]: result });
    const tabId = sender?.tab?.id;
    if (typeof tabId === 'number') void browser.tabs.remove(tabId).catch(() => {});
    return result.ok;
  };
  const p = chain.then(run, run);
  chain = p.catch(() => {});
  return p;
}

/** Call synchronously from the top level of the service worker. */
export function registerOAuthCallback(): void {
  browser.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
    void handleOAuthMessage(message, sender).then(
      (ok) => sendResponse({ ok }),
      () => sendResponse({ ok: false }),
    );
    return true;
  });
}
