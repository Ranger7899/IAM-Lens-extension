/** IAM-13 compare screen screenshots: `IAM_OUT_DIR=.output-IAM-13 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-13`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-13');
const PANEL = { width: 400, height: 800 };
const VE = '#/compare?a=roles%2Fviewer&b=roles%2Feditor';

interface Shot {
  name: string;
  hash: string;
  act?: (p: Page) => Promise<void>;
}
const SHOTS: Shot[] = [
  { name: 'viewer-vs-editor', hash: VE },
  {
    name: 'viewer-vs-editor-scrolled',
    hash: VE,
    act: async (p) => {
      await p.locator('main').evaluate((m) => (m.scrollTop = 700));
    },
  },
  {
    name: 'viewer-vs-editor-expanded',
    hash: VE,
    act: async (p) => {
      await p.locator('section[aria-label="Only in B"] h3 button').first().click();
      await p.locator('main').evaluate((m) => (m.scrollTop = 520));
    },
  },
  { name: 'empty', hash: '#/compare' },
  {
    name: 'picker-open',
    hash: '#/compare?a=roles%2Fviewer',
    act: async (p) => {
      await p.getByRole('combobox', { name: 'Role B' }).fill('storage adm');
    },
  },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize(PANEL);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html${s.hash}`);
      await page.waitForSelector('main article');
      await page.evaluate(() => document.fonts.ready);
      await s.act?.(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `${s.name}-${scheme}.png`) });
    });
  }
}
