/**
 * IAM-68 article visuals (gated, not part of the default suite):
 * `IAM_OUT_DIR=.output-w14 npm run build` then
 * `IAM_OUT_DIR=.output-w14 IAM_TEST_OUT=test-results-w14 ARTICLE_SHOTS=1 npx playwright test -c e2e/article-shots.config.ts`.
 * Writes docs/article/images/{role-detail,minimal-roles,custom-badge,trust-sheet}.png and frames for search.gif
 * into $ARTICLE_FRAMES (default test-results-w14-frames); scripts/article-gif.py assembles the GIF.
 */
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';
import { enableSidePanelTabs } from './sidePanelTabs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'docs', 'article', 'images');
const FRAMES = path.resolve(ROOT, process.env.ARTICLE_FRAMES ?? 'test-results-w14-frames');
const SIZE = { width: 400, height: 720 };

const FIVE = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];

async function open(context: import('@playwright/test').BrowserContext, id: string, hash: string) {
  await enableSidePanelTabs(context);
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`chrome-extension://${id}/sidepanel.html${hash}`);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

async function settle(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
  );
  await page.waitForTimeout(1100);
}

test.skip(!process.env.ARTICLE_SHOTS, 'article visuals are opt-in (ARTICLE_SHOTS=1)');

test('role-detail', async ({ context, extensionId }) => {
  const page = await open(context, extensionId, '#/role/roles%2Fstorage.objectViewer');
  await page.waitForSelector('h2');
  await settle(page);
  await page.screenshot({ path: path.join(OUT, 'role-detail.png') });
});

test('minimal-roles', async ({ context, extensionId }) => {
  const page = await open(context, extensionId, `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`);
  await page.setViewportSize({ width: 400, height: 1100 });
  await page.waitForSelector('article, main h2');
  await settle(page);
  await page.screenshot({ path: path.join(OUT, 'minimal-roles.png') });
});

test('custom-badge', async ({ context, extensionId }) => {
  // Seed one custom role into the extension's IndexedDB the way the options-page sync would store it.
  const seed = await open(context, extensionId, '');
  await seed.getByRole('searchbox').waitFor();
  await seed.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('iam-lens');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('custom-roles', 'readwrite');
      tx.objectStore('custom-roles').put({
        name: 'projects/payments-prod/roles/ledgerReader',
        title: 'Ledger reader',
        description: 'Read ledger exports and list objects in the payments buckets.',
        stage: 'GA',
        perms: ['storage.objects.get', 'storage.objects.list'],
        source: { kind: 'custom', parent: 'projects/payments-prod' },
      });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
  await seed.close();
  const page = await open(context, extensionId, '#/search?q=ledger');
  await page.getByText('Ledger reader').first().waitFor({ timeout: 10_000 });
  await settle(page);
  await page.screenshot({ path: path.join(OUT, 'custom-badge.png') });
});

test('search-frames', async ({ context, extensionId }) => {
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });
  const page = await open(context, extensionId, '');
  const box = page.getByRole('searchbox');
  await box.waitFor();
  await page.waitForTimeout(800);
  let n = 0;
  const snap = async (hold = 1) => {
    // hold = frame repeat count in the GIF (encoded in the filename: NNN_hold.png)
    await page.screenshot({ path: path.join(FRAMES, `${String(n++).padStart(3, '0')}_${hold}.png`) });
  };
  await box.click();
  await snap(8);
  const q = 'storage.objects.get';
  for (let i = 0; i < q.length; i++) {
    await page.keyboard.type(q[i]);
    await page.waitForTimeout(60);
    if (i % 2 === 1 || i === q.length - 1) await snap(1);
  }
  await page.waitForTimeout(700);
  await snap(18);
  // The permission search lands on the Permissions tab; switch to Roles (the roles that grant it), then open one.
  await page.getByRole('tab', { name: /^Roles/ }).click();
  await page.waitForTimeout(700);
  await snap(18);
  const first = page.locator('main li a, main li [role=link], main li button').first();
  await first.click();
  await page.waitForSelector('h2');
  await page.waitForTimeout(900);
  await snap(18);
});

test('trust-sheet', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 880, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForSelector('html[data-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  await page.getByRole('dialog', { name: 'Before you sign in' }).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'trust-sheet.png') });
});
