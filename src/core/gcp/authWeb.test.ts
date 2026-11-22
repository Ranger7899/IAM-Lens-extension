// @vitest-environment node
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./authConfig', async (orig) => ({
  ...(await orig<typeof import('./authConfig')>()),
  WEB_OAUTH_CLIENT_ID: 'web-client.apps.googleusercontent.com',
}));

import {
  AuthRequiredError,
  buildAuthUrl,
  consumePendingState,
  createPendingState,
  getAuthMethod,
  getToken,
  needsScopeUpgrade,
  signIn,
  signOut,
} from './auth';
import {
  AUTH_PENDING_KEY,
  AUTH_STORAGE_KEY,
  OAUTH_SCOPE,
  STATE_TTL_MS,
  WEB_OAUTH_CLIENT_ID,
  WEB_OAUTH_REDIRECT_URI,
} from './authConfig';
import { handleOAuthMessage, isTrustedSender, parseOAuthMessage } from '../../background/oauthCallback';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = fakeBrowser as any;
const ORIGIN = 'https://iamlens.vaultline.cloud';
const SENDER = { origin: ORIGIN, url: `${ORIGIN}/auth/callback.html`, tab: { id: 7 } };
const msg = (state: string, over: Record<string, unknown> = {}) => ({
  type: 'iam-lens-oauth',
  params: { access_token: 'web-tok', expires_in: '3599', scope: OAUTH_SCOPE, state, ...over },
});
const stored = async () => (await fakeBrowser.storage.session.get(AUTH_STORAGE_KEY))[AUTH_STORAGE_KEY];

let remove: ReturnType<typeof vi.fn>;
let create: ReturnType<typeof vi.fn>;
let removeCached: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fakeBrowser.reset();
  remove = vi.fn().mockResolvedValue(undefined);
  create = vi.fn().mockResolvedValue({ id: 42 });
  removeCached = vi.fn().mockResolvedValue(undefined);
  fb.tabs = { remove };
  fb.windows = { create, onRemoved: { addListener: vi.fn(), removeListener: vi.fn() } };
  fb.permissions = { request: vi.fn().mockResolvedValue(true) };
  fb.identity = { removeCachedAuthToken: removeCached, clearAllCachedAuthTokens: vi.fn() };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
});

describe('auth URL', () => {
  it('builds Google URL with account picker, implicit flow, both scopes and our redirect', () => {
    const u = new URL(buildAuthUrl('st4te'));
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('client_id')).toBe(WEB_OAUTH_CLIENT_ID);
    expect(u.searchParams.get('redirect_uri')).toBe(WEB_OAUTH_REDIRECT_URI);
    expect(WEB_OAUTH_REDIRECT_URI).toBe('https://iamlens.vaultline.cloud/auth/callback.html');
    expect(u.searchParams.get('response_type')).toBe('token');
    expect(u.searchParams.get('prompt')).toBe('select_account');
    expect(u.searchParams.get('include_granted_scopes')).toBe('true');
    expect(u.searchParams.get('scope')).toBe(OAUTH_SCOPE);
    expect(u.searchParams.get('state')).toBe('st4te');
  });
});

describe('fragment parsing (site/auth/callback.js)', () => {
  // The page script is plain browser JS (no ESM); evaluate it CommonJS-style to reach its pure parser.
  const mod = { exports: {} as { parseFragment(h: string): Record<string, string> } };
  new Function('module', readFileSync(new URL('../../../site/auth/callback.js', import.meta.url), 'utf8'))(
    mod,
  );
  const { parseFragment } = mod.exports;
  it('extracts known keys and drops others', () => {
    expect(
      parseFragment('#access_token=a%2Fb&expires_in=3599&scope=x%20y&state=s&token_type=Bearer&junk=1'),
    ).toEqual({ access_token: 'a/b', expires_in: '3599', scope: 'x y', state: 's' });
    expect(parseFragment('#error=access_denied&state=s')).toEqual({ error: 'access_denied', state: 's' });
    expect(parseFragment('')).toEqual({});
  });
});

describe('state lifecycle', () => {
  it('accepts a valid state exactly once', async () => {
    const s = await createPendingState();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
    expect(await consumePendingState(s)).toBe(true);
    expect(await consumePendingState(s)).toBe(false);
  });
  it('rejects a wrong state and keeps the pending one usable', async () => {
    const s = await createPendingState();
    expect(await consumePendingState('nope')).toBe(false);
    expect(await consumePendingState(undefined)).toBe(false);
    expect(await consumePendingState(s)).toBe(true);
  });
  it('rejects an expired state and removes it', async () => {
    const s = await createPendingState(1_000);
    expect(await consumePendingState(s, 1_000 + STATE_TTL_MS)).toBe(false);
    expect((await fakeBrowser.storage.session.get(AUTH_PENDING_KEY))[AUTH_PENDING_KEY]).toBeUndefined();
  });
  it('a newer sign-in replaces the older state', async () => {
    const a = await createPendingState();
    const b = await createPendingState();
    expect(await consumePendingState(a)).toBe(false);
    expect(await consumePendingState(b)).toBe(true);
  });
});

describe('external message handler', () => {
  it('stores a web session for a valid message, closes the tab, and is single-use', async () => {
    const s = await createPendingState();
    const now = 5_000_000;
    expect(await handleOAuthMessage(msg(s), SENDER, now)).toBe(true);
    expect(await stored()).toEqual({
      token: 'web-tok',
      expiresAt: now + 3599_000,
      scope: OAUTH_SCOPE,
      method: 'web',
    });
    expect(remove).toHaveBeenCalledWith(7);
    expect(await handleOAuthMessage(msg(s, { access_token: 'second' }), SENDER, now)).toBe(false);
    expect(((await stored()) as { token: string }).token).toBe('web-tok');
  });

  it('rejects wrong state, expired state, wrong type, bad shape', async () => {
    const s = await createPendingState(0);
    expect(await handleOAuthMessage(msg('wrong'), SENDER)).toBe(false);
    expect(await handleOAuthMessage({ ...msg(s), type: 'other' }, SENDER)).toBe(false);
    expect(await handleOAuthMessage(msg(s, { access_token: 42 }), SENDER)).toBe(false);
    expect(await handleOAuthMessage(msg(s, { expires_in: '-5' }), SENDER)).toBe(false);
    expect(await handleOAuthMessage(msg(s, { expires_in: 'abc' }), SENDER)).toBe(false);
    expect(await handleOAuthMessage(null, SENDER)).toBe(false);
    expect(await handleOAuthMessage(msg(s), SENDER, STATE_TTL_MS + 1)).toBe(false);
    expect(await stored()).toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });

  it('rejects wrong origin, wrong path and missing sender', async () => {
    const s = await createPendingState();
    const bad = [
      { origin: 'https://evil.example', url: `${ORIGIN}/auth/callback.html` },
      { origin: ORIGIN, url: `${ORIGIN}/auth/other.html` },
      { origin: ORIGIN, url: `${ORIGIN}/auth/callback.html/x` },
      { origin: ORIGIN, url: 'https://evil.example/auth/callback.html' },
      { origin: 'http://iamlens.vaultline.cloud', url: 'http://iamlens.vaultline.cloud/auth/callback.html' },
      { origin: ORIGIN, url: 'not a url' },
      { origin: ORIGIN },
      {},
      undefined,
    ];
    for (const sender of bad) {
      expect(isTrustedSender(sender)).toBe(false);
      expect(await handleOAuthMessage(msg(s), sender)).toBe(false);
    }
    expect(await stored()).toBeUndefined();
    // The state is not burned by rejected senders.
    expect(await consumePendingState(s)).toBe(true);
    expect(isTrustedSender(SENDER)).toBe(true);
  });

  it('caps expires_in and parses errors', () => {
    const p = parseOAuthMessage(msg('s', { expires_in: '9999999' }));
    expect(p).toMatchObject({ kind: 'token', expiresInS: 86400 });
    expect(
      parseOAuthMessage({ type: 'iam-lens-oauth', params: { error: 'access_denied', state: 's' } }),
    ).toEqual({
      kind: 'error',
      error: 'access_denied',
      state: 's',
    });
  });
});

describe('web signIn', () => {
  it('opens the picker popup and resolves when the callback lands', async () => {
    const p = signIn({ method: 'web' });
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(fb.permissions.request).toHaveBeenCalledWith({ origins: ['https://*.googleapis.com/'] });
    const opts = create.mock.calls[0][0];
    expect(opts.type).toBe('popup');
    const state = new URL(opts.url).searchParams.get('state')!;
    expect(await handleOAuthMessage(msg(state), SENDER)).toBe(true);
    await p;
    expect(await getAuthMethod()).toBe('web');
    expect(await getToken()).toBe('web-tok');
    expect(await needsScopeUpgrade()).toBe(false);
  });

  it('rejects when Google returned an error for our state', async () => {
    const p = signIn({ method: 'web' });
    p.catch(() => {});
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    const state = new URL(create.mock.calls[0][0].url).searchParams.get('state')!;
    await handleOAuthMessage({ type: 'iam-lens-oauth', params: { error: 'access_denied', state } }, SENDER);
    await expect(p).rejects.toBeInstanceOf(AuthRequiredError);
    expect(await stored()).toBeUndefined();
  });

  it('rejects on timeout', async () => {
    vi.useFakeTimers();
    try {
      const p = signIn({ method: 'web' });
      const assertion = expect(p).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(STATE_TTL_MS + 10);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no silent renewal once expired, and signOut skips Chrome token cache', async () => {
    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: { token: 'w', expiresAt: Date.now() - 1, scope: OAUTH_SCOPE, method: 'web' },
    });
    await expect(getToken()).rejects.toBeInstanceOf(AuthRequiredError);
    await expect(getToken({ forceRefresh: true })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(await getAuthMethod()).toBe('web');
    await signOut();
    expect(removeCached).not.toHaveBeenCalled();
    expect(fb.identity.clearAllCachedAuthTokens).not.toHaveBeenCalled();
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'https://oauth2.googleapis.com/revoke?token=w',
    );
    expect(await stored()).toBeUndefined();
  });

  it('needsScopeUpgrade uses the granted scope for web sessions', async () => {
    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: { token: 'w', expiresAt: Date.now() + 3e6, scope: 'x', method: 'web' },
    });
    expect(await needsScopeUpgrade()).toBe(true);
  });
});
