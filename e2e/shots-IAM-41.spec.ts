/**
 * IAM-41 screenshots (trust sheet, reason-specific error rows): `IAM_OUT_DIR=.output-IAM-41 IAM_TEST_OUT=test-results-IAM-41 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-41`.
 * Never signs in for real: a fake token is written to `storage.session` and the Google API requests
 * are fulfilled from fixtures at the network layer.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-41');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
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
    const err = (reason: string, message: string) =>
      json(
        {
          error: {
            code: 403,
            status: 'PERMISSION_DENIED',
            message,
            details: [
              { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason, domain: 'googleapis.com' },
            ],
          },
        },
        403,
      );
    if (url.includes('projects:search'))
      return json({
        projects: [
          { name: 'projects/101', projectId: 'payments-prod', displayName: 'Payments (prod)' },
          { name: 'projects/102', projectId: 'analytics-staging', displayName: 'Analytics staging' },
          { name: 'projects/103', projectId: 'legacy-sandbox', displayName: 'Legacy sandbox' },
        ],
      });
    if (url.includes('organizations:search')) return json({ organizations: [] });
    if (url.includes('/projects/payments-prod/roles'))
      return err('ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'Request had insufficient authentication scopes.');
    if (url.includes('/projects/analytics-staging/roles'))
      return err(
        'SERVICE_DISABLED',
        'Identity and Access Management (IAM) API has not been used in project 102.',
      );
    return err('IAM_PERMISSION_DENIED', "Permission 'iam.roles.list' denied on resource");
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

async function seed(page: Page, scope: string) {
  await page.evaluate(async (scope) => {
    await chrome.storage.session.set({
      gcpAuth: { token: 'fixture-token', expiresAt: Date.now() + 3_600_000, scope },
    });
  }, scope);
  await page.reload();
  await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
}

const BOTH = 'https://www.googleapis.com/auth/iam https://www.googleapis.com/auth/cloud-platform.read-only';

test('trust sheet (light)', async ({ context, extensionId }) => {
  const page = await open(context, extensionId, 'light');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  await page.getByRole('dialog', { name: 'Before you sign in' }).waitFor();
  await shot(page, 'trust-sheet', 'light', false);
});

test('error rows (light)', async ({ context, extensionId }) => {
  await mockGoogle(context);
  const page = await open(context, extensionId, 'light');
  await seed(page, BOTH);
  await page.getByRole('button', { name: 'Sync now' }).click();
  await page.getByText(/Last synced/).waitFor();
  await shot(page, 'error-rows', 'light');
});

test('scope upgrade banner (light)', async ({ context, extensionId }) => {
  await mockGoogle(context);
  const page = await open(context, extensionId, 'light');
  await seed(page, 'https://www.googleapis.com/auth/cloud-platform.read-only');
  await page.getByText('Sign in again to grant it').waitFor();
  await shot(page, 'scope-upgrade', 'light', false);
});
