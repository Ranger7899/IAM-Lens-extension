/**
 * Sign-in for custom roles via `chrome.identity.getAuthToken` (Chrome Extension OAuth client, IAM-58).
 * Chrome caches the token itself; we mirror it in `storage.session` as the "signed in" marker.
 */
import { browser } from 'wxt/browser';
import { clearCustomRoles } from '../snapshot';
import type { GetTokenOptions } from './http';
import {
  AUTH_STORAGE_KEY,
  IAM_SCOPE,
  OAUTH_REVOKE_URL,
  OAUTH_SCOPE,
  OAUTH_SCOPES,
  OPTIONAL_PERMISSIONS,
  TOKEN_ASSUMED_TTL_MS,
  TOKEN_MIN_TTL_MS,
} from './authConfig';

export interface StoredAuth {
  token: string;
  /** Epoch ms. */
  expiresAt: number;
  /** Space-separated scopes Google granted (from `grantedScopes`). */
  scope?: string;
}

const hasIamScope = (a: StoredAuth) => (a.scope ?? '').split(/\s+/).includes(IAM_SCOPE);

/** Thrown when no valid token exists and it cannot be refreshed silently; the UI should offer "Sign in again". */
export class AuthRequiredError extends Error {
  constructor(message = 'Sign-in required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

/** The stored token predates the `iam` scope. Only an interactive sign-in can add it. */
export class ScopeUpgradeRequiredError extends AuthRequiredError {
  constructor(message = 'Sign in again to grant the new permission') {
    super(message);
    this.name = 'ScopeUpgradeRequiredError';
  }
}

// The identity API is an optional permission, so access it lazily.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const identity = () => (browser as any).identity as typeof chrome.identity | undefined;

/** `getAuthToken` only exists in Google Chrome. Edge, Brave and others lack it or reject it. */
export class ChromeOnlyError extends Error {
  constructor(message = 'Custom-role sign-in needs Google Chrome.') {
    super(message);
    this.name = 'ChromeOnlyError';
  }
}

const UNSUPPORTED_RE = /not supported|unsupported|not implemented|not available/i;

async function readAuth(): Promise<StoredAuth | undefined> {
  const r = await browser.storage.session.get(AUTH_STORAGE_KEY);
  const v = r[AUTH_STORAGE_KEY] as Partial<StoredAuth> | undefined;
  return v && typeof v.token === 'string' && typeof v.expiresAt === 'number' ? (v as StoredAuth) : undefined;
}

type TokenResult = { token?: string; grantedScopes?: string[] } | string | undefined;

/** Wraps `chrome.identity.getAuthToken` (promise form in MV3, with a callback fallback). */
async function fetchToken(interactive: boolean): Promise<StoredAuth> {
  const id = identity();
  if (!id || typeof id.getAuthToken !== 'function') throw new ChromeOnlyError();
  let res: TokenResult;
  try {
    res = await new Promise<TokenResult>((resolve, reject) => {
      const done = (r: unknown) => {
        const err = chrome.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(r as TokenResult);
      };
      try {
        const p = id.getAuthToken({ interactive, scopes: OAUTH_SCOPES }, done) as unknown;
        if (p && typeof (p as Promise<unknown>).then === 'function') {
          (p as Promise<TokenResult>).then(resolve, reject);
        }
      } catch (e) {
        reject(e);
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Authorization failed';
    if (UNSUPPORTED_RE.test(msg)) throw new ChromeOnlyError();
    throw new AuthRequiredError(msg);
  }
  const token = typeof res === 'string' ? res : res?.token;
  if (!token) throw new AuthRequiredError('Authorization was cancelled');
  const granted =
    typeof res === 'object' && res?.grantedScopes?.length ? res.grantedScopes.join(' ') : undefined;
  // Without `grantedScopes` we cannot tell, so assume the requested scopes (needsScopeUpgrade then stays false).
  const auth: StoredAuth = {
    token,
    expiresAt: Date.now() + TOKEN_ASSUMED_TTL_MS,
    scope: granted ?? OAUTH_SCOPE,
  };
  await browser.storage.session.set({ [AUTH_STORAGE_KEY]: auth });
  return auth;
}

/** Must be called from a user gesture (click handler): requests optional permissions first, then signs in. */
export async function signIn(): Promise<void> {
  const granted = await browser.permissions.request({
    permissions: [...OPTIONAL_PERMISSIONS.permissions],
    origins: [...OPTIONAL_PERMISSIONS.origins],
  });
  if (!granted) throw new AuthRequiredError('Permission to contact Google APIs was denied');
  await fetchToken(true);
}

/** Compatible with the `getToken` option of the GCP clients. */
export async function getToken(opts: GetTokenOptions = {}): Promise<string> {
  const cur = await readAuth();
  if (!cur) throw new AuthRequiredError();
  if (!hasIamScope(cur)) throw new ScopeUpgradeRequiredError();
  if (!opts.forceRefresh && cur.expiresAt - Date.now() > TOKEN_MIN_TTL_MS) return cur.token;
  if (opts.forceRefresh) {
    // Chrome caches the token itself; drop it so the next call returns a new one.
    try {
      await identity()?.removeCachedAuthToken({ token: cur.token });
    } catch {
      /* best effort */
    }
  }
  return (await fetchToken(false)).token;
}

export async function isSignedIn(): Promise<boolean> {
  const cur = await readAuth();
  return !!cur && cur.expiresAt > Date.now();
}

/** True while a sign-in record exists, even if its token has expired (it can be renewed silently). */
export async function hasSession(): Promise<boolean> {
  return !!(await readAuth());
}

/** True when a token exists but was granted before the `iam` scope was requested. */
export async function needsScopeUpgrade(): Promise<boolean> {
  const cur = await readAuth();
  return !!cur && !hasIamScope(cur);
}

export async function signOut(): Promise<void> {
  const cur = await readAuth();
  if (cur) {
    try {
      await identity()?.removeCachedAuthToken({ token: cur.token });
    } catch {
      /* best effort */
    }
    try {
      await fetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(cur.token)}`, { method: 'POST' });
    } catch {
      /* best effort: still clear local state */
    }
    try {
      await identity()?.clearAllCachedAuthTokens?.();
    } catch {
      /* not available everywhere */
    }
  }
  await browser.storage.session.remove(AUTH_STORAGE_KEY);
  await clearCustomRoles();
}
