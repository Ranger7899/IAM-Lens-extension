/**
 * IAM-21 screenshots: `IAM_OUT_DIR=.output-IAM-21 IAM_TEST_OUT=test-results-IAM-21 SCREENSHOTS=1 npx playwright test shots-IAM-21`.
 * Seeds a fixture custom role straight into IndexedDB (same shape as `saveCustomRoles`).
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-21');
const ROLES = [
  {
    name: 'projects/payments-prod/roles/ledgerAuditor',
    title: 'Ledger auditor',
    description: 'Reads ledger objects and can purge old entries.',
    stage: 'GA',
    perms: ['storage.objects.get', 'storage.objects.list', 'payments.ledger.entries.delete'],
    source: { kind: 'custom', parent: 'projects/payments-prod' },
  },
  {
    name: 'organizations/555/roles/storageReader',
    title: 'Org storage reader',
    stage: 'BETA',
    perms: ['storage.objects.get'],
    source: { kind: 'custom', parent: 'organizations/555' },
  },
];

async function seed(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.evaluate(async (roles) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('iam-lens', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots');
        if (!d.objectStoreNames.contains('custom-roles')) d.createObjectStore('custom-roles', { keyPath: 'name' });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('custom-roles', 'readwrite');
      for (const r of roles) tx.objectStore('custom-roles').put(r);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, ROLES);
}

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

const SHOTS = [
  { name: 'search', hash: `#/search?q=${encodeURIComponent('ledger')}` },
  { name: 'search-storage', hash: `#/search?q=${encodeURIComponent('storage reader')}` },
  { name: 'role-detail', hash: `#/role/${encodeURIComponent(ROLES[0].name)}` },
  { name: 'permission-detail', hash: '#/permission/storage.objects.get' },
  { name: 'permission-custom-only', hash: '#/permission/payments.ledger.entries.delete' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const shot of SHOTS) {
    test(`${shot.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await seed(page, extensionId);
      await page.setViewportSize({ width: 400, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html${shot.hash}`);
      await page.waitForSelector('html[data-ready="true"]');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${scheme}.png`) });
    });
  }
}
