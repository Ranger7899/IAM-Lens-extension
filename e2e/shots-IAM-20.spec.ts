/**
 * IAM-20 screenshots (options page): `IAM_OUT_DIR=.output-IAM-20 IAM_TEST_OUT=test-results-IAM-20 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-20`.
 * Never signs in for real: a fake token is written to `storage.session` and the Google API requests
 * are fulfilled from fixtures at the network layer.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-20');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

const role = (parent: string, id: string, title: string, perms: string[]) => ({
  name: `${parent}/roles/${id}`,
  title,
  stage: 'GA',
  includedPermissions: perms,
});

async function mockGoogle(context: BrowserContext) {
  await context.route(/googleapis\.com/, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = req.url();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    if (url.includes('projects:search'))
      return json({
        projects: [
          { name: 'projects/101', projectId: 'payments-prod', displayName: 'Payments (prod)' },
          { name: 'projects/102', projectId: 'analytics-staging', displayName: 'Analytics staging' },
          { name: 'projects/103', projectId: 'legacy-sandbox', displayName: 'Legacy sandbox' },
        ],
      });
    if (url.includes('organizations:search'))
      return json({ organizations: [{ name: 'organizations/555', displayName: 'acme.example' }] });
    if (url.includes('/projects/payments-prod/roles'))
      return json({
        roles: [
          role('projects/payments-prod', 'ledgerReader', 'Ledger reader', [
            'storage.objects.get',
            'storage.objects.list',
          ]),
          role('projects/payments-prod', 'ledgerWriter', 'Ledger writer', ['storage.objects.create']),
          role('projects/payments-prod', 'auditor', 'Auditor', ['logging.logEntries.list']),
        ],
      });
    if (url.includes('/projects/analytics-staging/roles'))
      return json({
        roles: [role('projects/analytics-staging', 'queryRunner', 'Query runner', ['bigquery.jobs.create'])],
      });
    return json(
      { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Permission iam.roles.list denied' } },
      403,
    );
  });
}

async function open(context: BrowserContext, extensionId: string, scheme: 'light' | 'dark') {
  const page = await context.newPage();
  await page.setViewportSize({ width: 880, height: 1000 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function shot(page: Page, name: string, scheme: string, fullPage = true) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`), fullPage });
}

/** Fake token + a stored update-check result, so the page renders a realistic signed-in state. */
async function seedSignedIn(page: Page) {
  await page.evaluate(async () => {
    await chrome.storage.session.set({
      gcpAuth: {
        token: 'fixture-token',
        expiresAt: Date.now() + 3_600_000,
        scope: 'https://www.googleapis.com/auth/iam https://www.googleapis.com/auth/cloud-platform.read-only',
      },
    });
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('iam-lens');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put(
        {
          lastCheck: new Date(Date.now() - 3 * 3_600_000).toISOString(),
          lastResult: { status: 'up-to-date', version: 'fixture' },
        },
        'state',
      );
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  });
  await page.reload();
  await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`signed-out (${scheme})`, async ({ context, extensionId }) => {
    const page = await open(context, extensionId, scheme);
    await page.getByRole('button', { name: 'Sign in with Google' }).waitFor();
    await shot(page, 'signed-out', scheme);
  });

  test(`trust-sheet (${scheme})`, async ({ context, extensionId }) => {
    const page = await open(context, extensionId, scheme);
    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    await page.getByRole('dialog', { name: 'Before you sign in' }).waitFor();
    await shot(page, 'trust-sheet', scheme, false);
  });

  test(`signed-in (${scheme})`, async ({ context, extensionId }) => {
    await mockGoogle(context);
    const page = await open(context, extensionId, scheme);
    await seedSignedIn(page);
    await page.getByText('Signed in', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Sync now' }).click();
    await page.getByText(/Last synced/).waitFor();
    await shot(page, 'signed-in', scheme);
  });

  test(`sign-out-dialog (${scheme})`, async ({ context, extensionId }) => {
    await mockGoogle(context);
    const page = await open(context, extensionId, scheme);
    await seedSignedIn(page);
    await page.getByRole('button', { name: 'Sync now' }).click();
    await page.getByText(/Last synced/).waitFor();
    await page.getByRole('button', { name: 'Sign out & clear' }).click();
    await page.getByRole('dialog', { name: 'Sign out and clear custom roles?' }).waitFor();
    await shot(page, 'sign-out-dialog', scheme, false);
  });
}
