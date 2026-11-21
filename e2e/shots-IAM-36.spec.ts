/** IAM-36 screenshots (console layouts): `IAM_OUT_DIR=.output-IAM-36 IAM_TEST_OUT=test-results-IAM-36 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-36`. */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-36');
const SNAP = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '..', 'data', 'roles.snapshot.json'), 'utf8'),
);

/** previous = current minus 3 roles, minus 40 permissions' worth of grants, with 2 changed roles and a stage change. */
function fixture() {
  const cur = SNAP;
  const hex = (c: string) => c.repeat(12).slice(0, 12);
  const roles = cur.roles.map((r: { name: string; perms: number[]; stage: string }) => ({
    ...r,
    perms: [...r.perms],
  }));
  const drop = new Set(['roles/aiplatform.admin', 'roles/run.invoker', 'roles/storage.objectViewer']);
  const dropped = roles.filter((r: { name: string }) => drop.has(r.name));
  const kept = roles.filter((r: { name: string }) => !drop.has(r.name));
  // Changed roles: previous lacked 3 perms and was BETA.
  const editor = kept.find((r: { name: string }) => r.name === 'roles/storage.admin') ?? kept[5];
  const e2 = kept.find((r: { name: string }) => r.name === 'roles/compute.viewer') ?? kept[9];
  editor.perms = editor.perms.slice(0, -3);
  e2.perms = e2.perms.slice(0, -2);
  e2.stage = 'BETA';
  // Previous also had two old roles that no longer exist.
  const old = [
    {
      name: 'roles/legacy.reader',
      title: 'Legacy Reader',
      description: '',
      stage: 'DEPRECATED',
      perms: [0, 1, 2],
    },
    { name: 'roles/legacy.writer', title: 'Legacy Writer', description: '', stage: 'GA', perms: [3, 4] },
  ];
  void dropped;
  // Rebuild the permission table from what the previous roles still use (drops perms only the removed roles had).
  const used = new Set<number>();
  for (const r of kept) for (const i of r.perms) used.add(i);
  // Permissions that did not exist yet before: strip the last 4 used ones everywhere.
  const fresh = [...used].sort((a, b) => a - b).slice(-4);
  for (const f of fresh) used.delete(f);
  for (const r of kept) r.perms = r.perms.filter((i: number) => used.has(i));
  const names: string[] = [...used].sort((a, b) => a - b).map((i) => cur.permissions[i]);
  names.push('legacy.things.get', 'legacy.things.delete');
  const remap = new Map<number, number>([...used].sort((a, b) => a - b).map((i, k) => [i, k]));
  for (const r of kept) r.perms = r.perms.map((i: number) => remap.get(i)!);
  old[0].perms = [0, 1, names.length - 2];
  old[1].perms = [2, names.length - 1];
  const permissions = names;
  return {
    ...cur,
    version: hex('a'),
    sha256: hex('a').padEnd(64, 'a'),
    generatedAt: '2026-10-28T03:00:00.000Z',
    permissions,
    roles: [...kept, ...old],
  };
}

async function seed(page: Page, extensionId: string, withPrevious: boolean) {
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const previous = withPrevious ? fixture() : null;
  const current = { ...SNAP, generatedAt: '2026-11-19T03:00:00.000Z' };
  await page.evaluate(
    async ({ previous, current }) => {
      await new Promise<void>((res, rej) => {
        const req = indexedDB.open('iam-lens', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore('snapshots');
          db.createObjectStore('custom-roles', { keyPath: 'name' });
          db.createObjectStore('meta');
        };
        req.onerror = () => rej(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
          const s = tx.objectStore('snapshots');
          if (previous) {
            s.put(previous, 'previous');
            s.put(current, 'current');
            tx.objectStore('meta').put({ lastUpdatedAt: current.generatedAt }, 'state');
          }
          tx.oncomplete = () => {
            db.close();
            res();
          };
          tx.onerror = () => rej(tx.error);
        };
      });
    },
    { previous, current },
  );
}

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

const FIVE = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];

interface Shot {
  name: string;
  page: 'sidepanel' | 'popup' | 'options';
  hash: string;
  w: number;
  h: number;
  ready: string;
  seeded?: boolean;
  act?: (p: Page) => Promise<void>;
}
const SHOTS: Shot[] = [
  {
    name: 'search-roles',
    page: 'sidepanel',
    hash: '#/search?q=storage',
    w: 400,
    h: 800,
    ready: '[role=tabpanel]',
  },
  {
    name: 'search-permissions',
    page: 'sidepanel',
    hash: '#/search?q=storage.objects',
    w: 400,
    h: 800,
    ready: '[role=tabpanel]',
    act: async (p) => {
      await p.getByRole('tab', { name: /^Permissions/ }).click();
    },
  },
  {
    name: 'role-storage-admin',
    page: 'sidepanel',
    hash: '#/role/roles%2Fstorage.admin',
    w: 400,
    h: 900,
    ready: 'h2',
  },
  { name: 'role-owner', page: 'sidepanel', hash: '#/role/roles%2Fowner', w: 400, h: 900, ready: 'h2' },
  {
    name: 'permission-detail',
    page: 'sidepanel',
    hash: '#/permission/storage.objects.get',
    w: 400,
    h: 900,
    ready: 'article',
  },
  {
    name: 'minimal-five',
    page: 'sidepanel',
    hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`,
    w: 400,
    h: 1100,
    ready: 'article, main h2',
  },
  {
    name: 'compare',
    page: 'sidepanel',
    hash: '#/compare?a=roles%2Fviewer&b=roles%2Feditor',
    w: 400,
    h: 900,
    ready: 'section[aria-label="Only in B"]',
  },
  {
    name: 'whatsnew',
    page: 'sidepanel',
    hash: '#/whatsnew',
    w: 400,
    h: 900,
    ready: 'main article',
    seeded: true,
  },
  {
    name: 'popup',
    page: 'popup',
    hash: '#/search?q=storage',
    w: 380,
    h: 560,
    ready: '[aria-label="Top results"]',
  },
  { name: 'options', page: 'options', hash: '', w: 960, h: 800, ready: 'main' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: s.w, height: s.h });
      await page.emulateMedia({ colorScheme: scheme });
      if (s.seeded) await seed(page, extensionId, true);
      await page.goto(`chrome-extension://${extensionId}/${s.page}.html${s.hash}`);
      await page.waitForSelector(s.ready);
      await page.evaluate(() => document.fonts.ready);
      await s.act?.(page);
      await page.waitForFunction(() =>
        [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
      );
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `${s.name}-${scheme}.png`) });
    });
  }
}
