/** Sign-in for custom roles: `launchWebAuthFlow` implicit flow, token kept in `storage.session`. */
import { browser } from 'wxt/browser';
import { clearCustomRoles } from '../snapshot';
import type { GetTokenOptions } from './http';
import {
  AUTH_STORAGE_KEY,
  IAM_SCOPE,
  OAUTH_AUTH_URL,
  OAUTH_CLIENT_ID,
  OAUTH_REVOKE_URL,
  OAUTH_SCOPE,
  OPTIONAL_PERMISSIONS,
  TOKEN_MIN_TTL_MS,
} from './authConfig';

export interface StoredAuth {
  token: string;
  /** Epoch ms. */
  expiresAt: number;
  /** Space-separated scopes Google granted (from the redirect fragment). */
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
const identity = () => (browser as any).identity as typeof chrome.identity;

async function readAuth(): Promise<StoredAuth | undefined> {
  const r = await browser.storage.session.get(AUTH_STORAGE_KEY);
  const v = r[AUTH_STORAGE_KEY] as Partial<StoredAuth> | undefined;
  return v && typeof v.token === 'string' && typeof v.expiresAt === 'number' ? (v as StoredAuth) : undefined;
}

function randomState(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function runFlow(interactive: boolean): Promise<StoredAuth> {
  const state = randomState();
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    response_type: 'token',
    redirect_uri: identity().getRedirectURL(),
    scope: OAUTH_SCOPE,
    include_granted_scopes: 'true',
    state,
    prompt: interactive ? 'select_account' : 'none',
  });
  let redirect: string | undefined;
  try {
    redirect = await identity().launchWebAuthFlow({ url: `${OAUTH_AUTH_URL}?${params}`, interactive });
  } catch (e) {
    throw new AuthRequiredError(e instanceof Error ? e.message : 'Authorization failed');
  }
  if (!redirect) throw new AuthRequiredError('Authorization was cancelled');
  const hash = redirect.includes('#') ? redirect.slice(redirect.indexOf('#') + 1) : '';
  const frag = new URLSearchParams(hash);
  const err = frag.get('error');
  if (err) throw new AuthRequiredError(`Authorization failed: ${err}`);
  if (frag.get('state') !== state) throw new AuthRequiredError('Authorization state mismatch');
  const token = frag.get('access_token');
  const ttl = Number(frag.get('expires_in'));
  if (!token || !Number.isFinite(ttl)) throw new AuthRequiredError('Authorization response had no token');
  // Per RFC 6749 an omitted `scope` means it equals the requested scope.
  const auth: StoredAuth = {
    token,
    expiresAt: Date.now() + ttl * 1000,
    scope: frag.get('scope') ?? OAUTH_SCOPE,
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
  await runFlow(true);
}

/** Compatible with the `getToken` option of the GCP clients. */
export async function getToken(opts: GetTokenOptions = {}): Promise<string> {
  const cur = await readAuth();
  if (!cur) throw new AuthRequiredError();
  if (!hasIamScope(cur)) throw new ScopeUpgradeRequiredError();
  if (!opts.forceRefresh && cur.expiresAt - Date.now() > TOKEN_MIN_TTL_MS) return cur.token;
  return (await runFlow(false)).token;
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
      await fetch(`${OAUTH_REVOKE_URL}?token=${encodeURIComponent(cur.token)}`, { method: 'POST' });
    } catch {
      /* best effort: still clear local state */
    }
  }
  await browser.storage.session.remove(AUTH_STORAGE_KEY);
  await clearCustomRoles();
}
