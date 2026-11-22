/**
 * Sign-in for custom roles. Two methods with identical downstream behaviour:
 * - `'chrome'` (default): `chrome.identity.getAuthToken` (Chrome Extension OAuth client, IAM-58). Chrome caches the
 *   token itself; we mirror it in `storage.session` as the "signed in" marker.
 * - `'web'` (IAM-79): Google's account picker (implicit flow, Web application client) redirecting to our own
 *   callback page, which hands the token to the background worker (`background/oauthCallback.ts`).
 */
import { browser } from 'wxt/browser';
import { clearCustomRoles } from '../snapshot';
import type { GetTokenOptions } from './http';
import {
  AUTH_PENDING_KEY,
  AUTH_RESULT_KEY,
  AUTH_STORAGE_KEY,
  GOOGLE_AUTH_URL,
  IAM_SCOPE,
  OAUTH_REVOKE_URL,
  OAUTH_SCOPE,
  OAUTH_SCOPES,
  OPTIONAL_PERMISSIONS,
  STATE_TTL_MS,
  TOKEN_ASSUMED_TTL_MS,
  TOKEN_MIN_TTL_MS,
  WEB_OAUTH_CLIENT_ID,
  WEB_OAUTH_REDIRECT_URI,
} from './authConfig';

export interface StoredAuth {
  token: string;
  /** Epoch ms. */
  expiresAt: number;
  /** Space-separated scopes Google granted (from `grantedScopes`). */
  scope?: string;
  /** How the user signed in. Missing on records written before IAM-79 (treated as `'chrome'`). */
  method?: AuthMethod;
}

export type AuthMethod = 'chrome' | 'web';

export interface SignInOptions {
  method?: AuthMethod;
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
    method: 'chrome',
  };
  await browser.storage.session.set({ [AUTH_STORAGE_KEY]: auth });
  return auth;
}

/** The method of the stored session (also when its token has expired), so "Sign in again" can reuse it. */
export async function getAuthMethod(): Promise<AuthMethod | undefined> {
  const cur = await readAuth();
  return cur ? (cur.method ?? 'chrome') : undefined;
}

/** Random, unguessable `state` (256 bits). */
export function generateState(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Google's authorization URL for the web method (implicit flow with the account picker). */
export function buildAuthUrl(state: string, clientId: string = WEB_OAUTH_CLIENT_ID): string {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: WEB_OAUTH_REDIRECT_URI,
    response_type: 'token',
    scope: OAUTH_SCOPE,
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${q.toString()}`;
}

interface Pending {
  state: string;
  expiresAt: number;
}

/** Creates and stores the single pending web sign-in state (a new one replaces any older one). */
export async function createPendingState(now = Date.now()): Promise<string> {
  const state = generateState();
  const pending: Pending = { state, expiresAt: now + STATE_TTL_MS };
  await browser.storage.session.remove(AUTH_RESULT_KEY);
  await browser.storage.session.set({ [AUTH_PENDING_KEY]: pending });
  return state;
}

/**
 * Single-use check: true only if `state` equals the stored pending state and it has not expired. The pending record
 * is always removed when it matches or has expired, so a state can never be used twice.
 */
export async function consumePendingState(state: unknown, now = Date.now()): Promise<boolean> {
  const r = await browser.storage.session.get(AUTH_PENDING_KEY);
  const p = r[AUTH_PENDING_KEY] as Partial<Pending> | undefined;
  if (!p || typeof p.state !== 'string' || typeof p.expiresAt !== 'number') return false;
  if (p.expiresAt <= now) {
    await browser.storage.session.remove(AUTH_PENDING_KEY);
    return false;
  }
  if (typeof state !== 'string' || state.length !== p.state.length || state !== p.state) return false;
  await browser.storage.session.remove(AUTH_PENDING_KEY);
  return true;
}

export type WebAuthResult = { state: string; ok: true } | { state: string; ok: false; error: string };

/** Resolves when the background worker records the outcome for `state`; rejects on error, timeout or a closed window. */
function waitForResult(state: string, windowId: number | undefined): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (r: WebAuthResult | undefined) => {
      if (settled || !r || r.state !== state) return;
      settled = true;
      cleanup();
      if (r.ok) resolve();
      else reject(new AuthRequiredError(r.error));
    };
    const onChanged = (changes: Record<string, { newValue?: unknown }>) => {
      if (changes[AUTH_RESULT_KEY]) finish(changes[AUTH_RESULT_KEY].newValue as WebAuthResult | undefined);
    };
    const check = async () =>
      finish(
        (await browser.storage.session.get(AUTH_RESULT_KEY))[AUTH_RESULT_KEY] as WebAuthResult | undefined,
      );
    const onRemoved = (id: number) => {
      if (id !== windowId) return;
      // The callback closes its own window right after storing the result: give that a moment before giving up.
      setTimeout(() => {
        void check().then(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new AuthRequiredError('The sign-in window was closed before sign-in finished'));
        });
      }, 1000);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new AuthRequiredError('Sign-in timed out'));
    }, STATE_TTL_MS);
    const cleanup = () => {
      clearTimeout(timer);
      browser.storage.onChanged.removeListener(onChanged as never);
      browser.windows?.onRemoved?.removeListener(onRemoved);
    };
    browser.storage.onChanged.addListener(onChanged as never);
    browser.windows?.onRemoved?.addListener(onRemoved);
    void check();
  });
}

async function webSignIn(): Promise<void> {
  if (!WEB_OAUTH_CLIENT_ID)
    throw new AuthRequiredError('Signing in with another Google account is not set up');
  const state = await createPendingState();
  let windowId: number | undefined;
  try {
    const win = await browser.windows.create({
      url: buildAuthUrl(state),
      type: 'popup',
      width: 520,
      height: 720,
    });
    windowId = win?.id;
  } catch (e) {
    await browser.storage.session.remove(AUTH_PENDING_KEY);
    throw new AuthRequiredError(e instanceof Error ? e.message : 'Could not open the sign-in window');
  }
  try {
    await waitForResult(state, windowId);
  } finally {
    // Whatever the outcome, this state is spent.
    await browser.storage.session.remove([AUTH_PENDING_KEY, AUTH_RESULT_KEY]);
  }
}

/**
 * Must be called from a user gesture (click handler): requests optional permissions first, then signs in.
 * `method` defaults to `'chrome'`, so existing callers keep working.
 */
export async function signIn(opts: SignInOptions = {}): Promise<void> {
  const method = opts.method ?? 'chrome';
  const granted = await browser.permissions.request(
    method === 'web'
      ? { origins: [...OPTIONAL_PERMISSIONS.origins] }
      : { permissions: [...OPTIONAL_PERMISSIONS.permissions], origins: [...OPTIONAL_PERMISSIONS.origins] },
  );
  if (!granted) throw new AuthRequiredError('Permission to contact Google APIs was denied');
  if (method === 'web') await webSignIn();
  else await fetchToken(true);
}

/** Compatible with the `getToken` option of the GCP clients. */
export async function getToken(opts: GetTokenOptions = {}): Promise<string> {
  const cur = await readAuth();
  if (!cur) throw new AuthRequiredError();
  if (!hasIamScope(cur)) throw new ScopeUpgradeRequiredError();
  if (!opts.forceRefresh && cur.expiresAt - Date.now() > TOKEN_MIN_TTL_MS) return cur.token;
  // The implicit flow has no silent renewal: once the token is (nearly) expired the user must sign in again.
  if (cur.method === 'web') throw new AuthRequiredError();
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
    if (cur.method !== 'web') {
      try {
        await identity()?.removeCachedAuthToken({ token: cur.token });
      } catch {
        /* best effort */
      }
    }
    try {
      await fetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(cur.token)}`, { method: 'POST' });
    } catch {
      /* best effort: still clear local state */
    }
    if (cur.method !== 'web') {
      try {
        await identity()?.clearAllCachedAuthTokens?.();
      } catch {
        /* not available everywhere */
      }
    }
  }
  await browser.storage.session.remove([AUTH_STORAGE_KEY, AUTH_PENDING_KEY, AUTH_RESULT_KEY]);
  await clearCustomRoles();
}
