/**
 * IAM-79: the own-domain OAuth callback page hands the token to the extension. Google is never contacted: the
 * callback origin is served from the local `site/auth` files, and the "pending sign-in" state is created through
 * `chrome.storage.session` exactly as `signIn({method:'web'})` would. The build under test is made with the
 * test-only `WXT_TEST_WEB_CLIENT_ID` so the second button exists; shipped builds leave it empty.
 */
import { test as base, chromium, expect, type BrowserContext } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = '.output-e2e-web';
const EXT = path.join(ROOT, OUT, 'chrome-mv3');
const ORIGIN = 'https://iamlens.vaultline.cloud';
const SCOPE = 'https://www.googleapis.com/auth/iam https://www.googleapis.com/auth/cloud-platform.read-only';

const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, run) => {
    const context = await chromium.launchPersistentContext(
      mkdtempSync(path.join(tmpdir(), 'iam-lens-e2e-')),
      {
        channel: 'chromium',
        args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
      },
    );
    // Serve our own callback page locally; nothing leaves the machine.
    await context.route(`${ORIGIN}/auth/**`, async (route) => {
      const file = new URL(route.request().url()).pathname.replace('/auth/', '');
      const types: Record<string, string> = {
        'callback.html': 'text/html',
        'callback.js': 'text/javascript',
      };
      if (!types[file]) return route.fulfill({ status: 404, body: 'not found' });
      await route.fulfill({
        status: 200,
        contentType: types[file],
        body: readFileSync(path.join(ROOT, 'site', 'auth', file)),
      });
    });
    await context.route(/https:\/\/([a-z-]+\.)?(googleapis|google)\.com\/.*/, (r) => r.abort());
    await run(context);
    await context.close();
  },
  extensionId: async ({ context }, run) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await run(new URL(worker.url()).host);
  },
});

test.beforeAll(() => {
  execSync(`npx wxt build`, {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, WXT_TEST_WEB_CLIENT_ID: 'e2e-test.apps.googleusercontent.com', IAM_OUT_DIR: OUT },
  });
  test.setTimeout(120_000);
});

const callbackUrl = (state: string) =>
  `${ORIGIN}/auth/callback.html#access_token=fake-token&expires_in=3600&token_type=Bearer&scope=${encodeURIComponent(SCOPE)}&state=${state}`;

async function optionsPage(context: BrowserContext, extensionId: string) {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  return page;
}
const readAuth = (p: import('@playwright/test').Page) =>
  p.evaluate(
    async () => (await chrome.storage.session.get('gcpAuth')).gcpAuth as Record<string, unknown> | undefined,
  );
const setPending = (p: import('@playwright/test').Page, state: string, expiresIn = 600_000) =>
  p.evaluate(
    ([s, ms]) =>
      chrome.storage.session.set({ gcpAuthPending: { state: s, expiresAt: Date.now() + (ms as number) } }),
    [state, expiresIn] as const,
  );

test('manifest limits externally_connectable to the callback path', async ({ context, extensionId }) => {
  const page = await optionsPage(context, extensionId);
  const m = await page.evaluate(() => chrome.runtime.getManifest() as Record<string, unknown>);
  expect(m.externally_connectable).toEqual({ matches: ['https://iamlens.vaultline.cloud/auth/*'] });
});

test('the second sign-in button is shown when a web client is configured', async ({
  context,
  extensionId,
}) => {
  const page = await optionsPage(context, extensionId);
  await expect(page.getByRole('button', { name: 'Use a different Google account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with Google (Chrome account)' })).toBeVisible();
});

test('a valid callback stores a web session and the page confirms; the state is single-use', async ({
  context,
  extensionId,
}) => {
  const opts = await optionsPage(context, extensionId);
  await setPending(opts, 'good-state');
  const cb = await context.newPage();
  const closed = cb.waitForEvent('close', { timeout: 10_000 }).catch(() => undefined);
  await cb.goto(callbackUrl('good-state'));
  await closed; // the background closes the auth tab
  await expect.poll(() => readAuth(opts)).toMatchObject({ token: 'fake-token', method: 'web', scope: SCOPE });
  const auth = (await readAuth(opts))!;
  expect(auth.expiresAt as number).toBeGreaterThan(Date.now() + 3_000_000);

  // Replaying the same state must not overwrite the session.
  const replay = await context.newPage();
  await replay.goto(callbackUrl('good-state').replace('fake-token', 'other-token'));
  await expect(replay.locator('#title')).toHaveText('Sign-in not completed');
  expect((await readAuth(opts))!.token).toBe('fake-token');

  // The options page reports the method.
  await opts.reload();
  await expect(opts.getByText('Signed in with another Google account')).toBeVisible();
});

test('a wrong or expired state is rejected and nothing is stored', async ({ context, extensionId }) => {
  const opts = await optionsPage(context, extensionId);
  await setPending(opts, 'right-state');
  const cb = await context.newPage();
  await cb.goto(callbackUrl('wrong-state'));
  await expect(cb.locator('#title')).toHaveText('Sign-in not completed');
  // The fragment was cleared from the address bar immediately.
  expect(cb.url()).toBe(`${ORIGIN}/auth/callback.html`);
  expect(await readAuth(opts)).toBeUndefined();

  await setPending(opts, 'old-state', -1000);
  await cb.goto(callbackUrl('old-state'));
  await expect(cb.locator('#title')).toHaveText('Sign-in not completed');
  expect(await readAuth(opts)).toBeUndefined();
});

test('messages from other pages are ignored', async ({ context, extensionId }) => {
  const opts = await optionsPage(context, extensionId);
  await setPending(opts, 'st');
  // A page on the right origin but a different path is not in externally_connectable at all.
  await context.route(`${ORIGIN}/auth/evil.html`, (r) =>
    r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>x</title>' }),
  );
  const other = await context.newPage();
  await other.goto(`${ORIGIN}/auth/evil.html`);
  const reply = await other.evaluate(
    ([id, state]) =>
      new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(
            id,
            { type: 'iam-lens-oauth', params: { access_token: 't', expires_in: '3600', scope: 's', state } },
            (r) => resolve(r ?? chrome.runtime.lastError?.message ?? 'none'),
          );
        } catch (e) {
          resolve(String(e));
        }
      }),
    [extensionId, 'st'],
  );
  expect(reply).not.toEqual({ ok: true });
  expect(await readAuth(opts)).toBeUndefined();
});
