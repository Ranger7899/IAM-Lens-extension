/**
 * Design review screenshots. Opt-in: `npm run shots` (builds the extension, loads it unpacked, and writes
 * PNGs to test-results/screens/). Not part of the default `npm run e2e`.
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(
  import.meta.dirname,
  '..',
  `${process.env.IAM_TEST_OUT ?? 'test-results'}-screens`,
);

interface Shot {
  name: string;
  page: 'popup' | 'sidepanel' | 'options';
  hash?: string;
  size: { width: number; height: number };
  act?: (page: Page) => Promise<void>;
}

const POPUP = { width: 380, height: 560 };
const PANEL = { width: 400, height: 800 };

const SHOTS: Shot[] = [
  { name: 'popup', page: 'popup', hash: '#q=storage.objects', size: POPUP },
  { name: 'popup-empty', page: 'popup', size: POPUP },
  { name: 'sidepanel', page: 'sidepanel', hash: '#q=storage', size: PANEL },
  { name: 'sidepanel-empty', page: 'sidepanel', size: PANEL },
  {
    name: 'sidepanel-search-focused',
    page: 'sidepanel',
    hash: '#q=storage',
    size: PANEL,
    act: async (p) => {
      await p.getByRole('searchbox').focus();
    },
  },
  { name: 'sidepanel-role', page: 'sidepanel', hash: '#role=roles/storage.admin', size: PANEL },
  {
    name: 'sidepanel-role-scrolled',
    page: 'sidepanel',
    hash: '#role=roles/storage.admin',
    size: PANEL,
    act: async (p) => {
      await p.locator('main').evaluate((m) => (m.scrollTop = 520));
    },
  },
  { name: 'sidepanel-permission', page: 'sidepanel', hash: '#perm=storage.objects.get', size: PANEL },
  { name: 'options', page: 'options', size: { width: 960, height: 720 } },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const shot of SHOTS) {
    test(`${shot.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize(shot.size);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(
        `chrome-extension://${extensionId}/${shot.page}.html${shot.page === 'sidepanel' ? '?demo=1' : ''}${shot.hash ?? ''}`,
      );
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await shot.act?.(page);
      await page.waitForTimeout(1100); // let spring / stagger animations settle
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${scheme}.png`) });
    });
  }
}

// Real (non-demo) side panel: data states. The snapshot request is intercepted instead of adding test hooks.
const DATA_STATES = [
  { name: 'iam-loading', route: (r: import('@playwright/test').Route) => void r.request(), wait: false },
  { name: 'iam-error', route: (r: import('@playwright/test').Route) => void r.abort(), wait: true },
  { name: 'iam-ready-stub', route: undefined, wait: true },
] as const;

for (const scheme of ['light', 'dark'] as const) {
  for (const st of DATA_STATES) {
    test(`${st.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize(PANEL);
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      if (st.route) await page.route('**/roles.snapshot-*.json', st.route);
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html#/role/roles%2Fviewer`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(st.wait ? 800 : 300);
      await page.screenshot({ path: path.join(OUT, `${st.name}-${scheme}.png`) });
    });
  }
}
