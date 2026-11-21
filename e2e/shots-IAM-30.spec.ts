/** IAM-30 screenshots (permission ordering + minimal roles): `IAM_OUT_DIR=.output-IAM-30 IAM_TEST_OUT=test-results-IAM-30 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-30`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-30');
const SHOTS = [
  { name: 'permission-storage-objects-get', hash: '#/permission/storage.objects.get' },
  { name: 'permission-iam-serviceAccounts-actAs', hash: '#/permission/iam.serviceAccounts.actAs' },
  { name: 'permission-picker', hash: '#/permission/storage.objects.*' },
  { name: 'permission-run-services-get', hash: '#/permission/run.services.get' },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const shot of SHOTS) {
    test(`${shot.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 400, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html${shot.hash}`);
      await page.waitForSelector('article, [aria-label="Matching permissions"]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1100);
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${scheme}.png`) });
    });
  }
}

const PANEL = { width: 400, height: 800 };
const FIVE = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];

interface Shot {
  name: string;
  hash: string;
  act?: (p: Page) => Promise<void>;
}
const MIN_SHOTS: Shot[] = [
  { name: 'empty', hash: '#/minimal' },
  { name: 'five', hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}` },
  {
    name: 'five-scrolled',
    hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`,
    act: async (p) => {
      await p.locator('main').evaluate((m) => (m.scrollTop = 900));
    },
  },
  {
    name: 'five-bottom',
    hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`,
    act: async (p) => {
      await p.locator('main').evaluate((m) => (m.scrollTop = m.scrollHeight));
    },
  },
  {
    name: 'problems',
    hash: '#/minimal',
    act: async (p) => {
      await p
        .getByRole('textbox')
        .fill(
          'storage.objects.get\nstorage.objects.list nope.things.get objects.get\ncompute.instances.start',
        );
    },
  },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const s of MIN_SHOTS) {
    test(`minimal-${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize(PANEL);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html${s.hash}`);
      await page.waitForSelector('main textarea');
      await page.evaluate(() => document.fonts.ready);
      await s.act?.(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `minimal-${s.name}-${scheme}.png`) });
    });
  }
}
