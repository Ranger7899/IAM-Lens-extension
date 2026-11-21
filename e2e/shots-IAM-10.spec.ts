/** IAM-10 role screen screenshots: `IAM_OUT_DIR=.output-IAM-10 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-10`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-10');
const PANEL = { width: 400, height: 800 };

interface Shot {
  name: string;
  role: string;
  act?: (p: Page) => Promise<void>;
}
const SHOTS: Shot[] = [
  { name: 'objectViewer', role: 'roles/storage.objectViewer' },
  { name: 'editor', role: 'roles/editor' },
  {
    name: 'editor-scrolled',
    role: 'roles/editor',
    act: async (p) => {
      await p.locator('main').evaluate((m) => (m.scrollTop = 600));
    },
  },
  {
    name: 'editor-filtered',
    role: 'roles/editor',
    act: async (p) => {
      await p.getByRole('searchbox').fill('bucket');
      await p.getByRole('button', { name: /Write/ }).click();
    },
  },
  { name: 'owner', role: 'roles/owner' },
  { name: 'notfound', role: 'roles/storage.nope' },
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
      await page.goto(`chrome-extension://${extensionId}/sidepanel.html#/role/${encodeURIComponent(s.role)}`);
      await page.waitForSelector('main article, main [role="alert"]');
      await page.evaluate(() => document.fonts.ready);
      await s.act?.(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `${s.name}-${scheme}.png`) });
    });
  }
}

test('owner expands a big service quickly', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.setViewportSize(PANEL);
  await page.goto(
    `chrome-extension://${extensionId}/sidepanel.html#/role/${encodeURIComponent('roles/owner')}`,
  );
  await page.waitForSelector('main article');
  const ms = await page.evaluate(async () => {
    const t0 = performance.now();
    const btn = [...document.querySelectorAll<HTMLButtonElement>('h3 button')].find((b) =>
      b.textContent?.includes('aiplatform'),
    )!;
    btn.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  console.log(`owner expand aiplatform: ${ms.toFixed(0)} ms`);
});
