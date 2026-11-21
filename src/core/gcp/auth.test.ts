// @vitest-environment node
import 'fake-indexeddb/auto';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRequiredError, getToken, isSignedIn, signIn, signOut } from './auth';
import { AUTH_STORAGE_KEY, OAUTH_CLIENT_ID, OAUTH_SCOPE } from './authConfig';

const REDIRECT = 'https://nkkmmkcohkjacpgiaiiadjmhcbmhgaen.chromiumapp.org/';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fb = fakeBrowser as any;
let launch: ReturnType<typeof vi.fn>;
let request: ReturnType<typeof vi.fn>;

const reply =
  (tok: string, extra = '') =>
  (url: string) => {
    const state = new URL(url).searchParams.get('state');
    return Promise.resolve(
      `${REDIRECT}#access_token=${tok}&expires_in=3600&token_type=Bearer&state=${extra || state}`,
    );
  };

beforeEach(async () => {
  fakeBrowser.reset();
  launch = vi.fn(({ url }: { url: string }) => reply('tok1')(url));
  fb.identity = { getRedirectURL: () => REDIRECT, launchWebAuthFlow: launch };
  request = vi.fn().mockResolvedValue(true);
  fb.permissions = { request };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
});

describe('gcp auth', () => {
  it('signIn requests permissions then launches implicit flow and stores token', async () => {
    await signIn();
    expect(request).toHaveBeenCalledWith({
      permissions: ['identity'],
      origins: ['https://*.googleapis.com/'],
    });
    const { url, interactive } = launch.mock.calls[0][0];
    const p = new URL(url).searchParams;
    expect(interactive).toBe(true);
    expect(p.get('client_id')).toBe(OAUTH_CLIENT_ID);
    expect(p.get('response_type')).toBe('token');
    expect(p.get('scope')).toBe(OAUTH_SCOPE);
    expect(p.get('prompt')).toBe('select_account');
    expect(p.get('redirect_uri')).toBe(REDIRECT);
    expect(await isSignedIn()).toBe(true);
    expect(await getToken()).toBe('tok1');
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it('rejects state mismatch and denied permissions', async () => {
    launch.mockImplementation(reply('x', 'wrong'));
    await expect(signIn()).rejects.toBeInstanceOf(AuthRequiredError);
    expect(await isSignedIn()).toBe(false);
    request.mockResolvedValue(false);
    await expect(signIn()).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('refreshes silently when near expiry or forced', async () => {
    await signIn();
    launch.mockImplementation(({ url }: { url: string }) => reply('tok2')(url));
    expect(await getToken({ forceRefresh: true })).toBe('tok2');
    const last = launch.mock.calls.at(-1)![0];
    expect(last.interactive).toBe(false);
    expect(new URL(last.url).searchParams.get('prompt')).toBe('none');
    await fakeBrowser.storage.session.set({
      [AUTH_STORAGE_KEY]: { token: 'old', expiresAt: Date.now() + 30_000 },
    });
    launch.mockImplementation(({ url }: { url: string }) => reply('tok3')(url));
    expect(await getToken()).toBe('tok3');
  });

  it('throws AuthRequiredError when not signed in or silent refresh fails', async () => {
    await expect(getToken()).rejects.toBeInstanceOf(AuthRequiredError);
    await signIn();
    launch.mockRejectedValue(new Error('user interaction required'));
    await expect(getToken({ forceRefresh: true })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('signOut revokes, clears session and custom roles', async () => {
    await signIn();
    await signOut();
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/revoke?token=tok1');
    expect(init.method).toBe('POST');
    expect(await isSignedIn()).toBe(false);
  });
});
