// @vitest-environment node
import 'fake-indexeddb/auto';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthRequiredError,
  ChromeOnlyError,
  ScopeUpgradeRequiredError,
  getToken,
  needsScopeUpgrade,
  isSignedIn,
  signIn,
  signOut,
} from './auth';
import { AUTH_STORAGE_KEY, IAM_SCOPE, OAUTH_CLIENT_ID, OAUTH_SCOPE, OAUTH_SCOPES } from './authConfig';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = fakeBrowser as any;
let getAuthToken: ReturnType<typeof vi.fn>;
let removeCached: ReturnType<typeof vi.fn>;
let clearAll: ReturnType<typeof vi.fn>;
let request: ReturnType<typeof vi.fn>;

const ok = (token: string, grantedScopes: string[] = OAUTH_SCOPES) =>
  Promise.resolve({ token, grantedScopes });

beforeEach(async () => {
  fakeBrowser.reset();
  getAuthToken = vi.fn(() => ok('tok1'));
  removeCached = vi.fn().mockResolvedValue(undefined);
  clearAll = vi.fn().mockResolvedValue(undefined);
  fb.identity = { getAuthToken, removeCachedAuthToken: removeCached, clearAllCachedAuthTokens: clearAll };
  request = vi.fn().mockResolvedValue(true);
  fb.permissions = { request };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
});

describe('gcp auth', () => {
  it('uses the Chrome Extension client and both scopes', () => {
    expect(OAUTH_CLIENT_ID).toBe('609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb.apps.googleusercontent.com');
    expect(OAUTH_SCOPE).toBe(
      'https://www.googleapis.com/auth/iam https://www.googleapis.com/auth/cloud-platform.read-only',
    );
  });

  it('signIn requests permissions then calls getAuthToken interactively and stores the marker', async () => {
    await signIn();
    expect(request).toHaveBeenCalledWith({
      permissions: ['identity'],
      origins: ['https://*.googleapis.com/'],
    });
    expect(getAuthToken).toHaveBeenCalledTimes(1);
    const opts = getAuthToken.mock.calls[0][0];
    expect(opts.interactive).toBe(true);
    expect(opts.scopes).toEqual(OAUTH_SCOPES);
    expect(await isSignedIn()).toBe(true);
    expect(await getToken()).toBe('tok1');
    expect(getAuthToken).toHaveBeenCalledTimes(1);
  });

  it('rejects denied permissions and cancelled sign-in', async () => {
    request.mockResolvedValue(false);
    await expect(signIn()).rejects.toBeInstanceOf(AuthRequiredError);
    request.mockResolvedValue(true);
    getAuthToken.mockRejectedValue(new Error('The user did not approve access.'));
    await expect(signIn()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(await isSignedIn()).toBe(false);
  });

  it('refreshes silently when near expiry or forced', async () => {
    await signIn();
    getAuthToken.mockImplementation(() => ok('tok2'));
    expect(await getToken({ forceRefresh: true })).toBe('tok2');
    expect(getAuthToken.mock.calls.at(-1)![0].interactive).toBe(false);
    expect(removeCached).toHaveBeenCalledWith({ token: 'tok1' });
    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: { token: 'old', expiresAt: Date.now() + 30_000, scope: OAUTH_SCOPE },
    });
    getAuthToken.mockImplementation(() => ok('tok3'));
    expect(await getToken()).toBe('tok3');
    expect(getAuthToken.mock.calls.at(-1)![0].interactive).toBe(false);
  });

  it('throws AuthRequiredError when not signed in or silent refresh fails', async () => {
    await expect(getToken()).rejects.toBeInstanceOf(AuthRequiredError);
    await signIn();
    getAuthToken.mockRejectedValue(new Error('OAuth2 not granted or revoked.'));
    await expect(getToken({ forceRefresh: true })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('throws ChromeOnlyError when getAuthToken is missing or unsupported', async () => {
    fb.identity = {};
    await expect(signIn()).rejects.toBeInstanceOf(ChromeOnlyError);
    fb.identity = {
      getAuthToken: vi.fn().mockRejectedValue(new Error('This API is not supported on Microsoft Edge.')),
    };
    await expect(signIn()).rejects.toBeInstanceOf(ChromeOnlyError);
    expect(await isSignedIn()).toBe(false);
  });

  it('signOut drops the cached token, revokes, clears session and custom roles', async () => {
    await signIn();
    await signOut();
    expect(removeCached).toHaveBeenCalledWith({ token: 'tok1' });
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/revoke?token=tok1');
    expect(init.method).toBe('POST');
    expect(clearAll).toHaveBeenCalled();
    expect(await isSignedIn()).toBe(false);
  });

  it('stores grantedScopes and flags tokens that lack the iam scope', async () => {
    await signIn();
    const stored = (await fakeBrowser.storage.session.get(AUTH_STORAGE_KEY))[AUTH_STORAGE_KEY] as {
      scope: string;
    };
    expect(stored.scope).toBe(OAUTH_SCOPE);
    expect(await needsScopeUpgrade()).toBe(false);

    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: {
        token: 'old',
        expiresAt: Date.now() + 3_600_000,
        scope: 'https://www.googleapis.com/auth/cloud-platform.read-only',
      },
    });
    expect(await needsScopeUpgrade()).toBe(true);
    await expect(getToken()).rejects.toBeInstanceOf(ScopeUpgradeRequiredError);
    // Legacy token with no stored scope also needs the upgrade, and no silent refresh is attempted.
    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: { token: 'o', expiresAt: Date.now() + 3_600_000 },
    });
    getAuthToken.mockClear();
    await expect(getToken({ forceRefresh: true })).rejects.toBeInstanceOf(ScopeUpgradeRequiredError);
    expect(getAuthToken).not.toHaveBeenCalled();
    expect(IAM_SCOPE).toContain('/auth/iam');
  });

  it('assumes the requested scopes when grantedScopes is not reported', async () => {
    getAuthToken.mockImplementation(() => Promise.resolve({ token: 't' }));
    await signIn();
    expect(await needsScopeUpgrade()).toBe(false);
  });
});
