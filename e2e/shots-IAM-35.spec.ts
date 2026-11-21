/** IAM-35 screenshots (Console theme): `IAM_OUT_DIR=.output-IAM-35 IAM_TEST_OUT=test-results-IAM-35 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-35`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-35');
const SHOTS = [
  { name: 'search', page: 'sidepanel', hash: '#/search?q=storage', ready: '[role=tabpanel]', w: 400, h: 800 },
  {
    name: 'role-storage-admin',
    page: 'sidepanel',
    hash: '#/role/roles%2Fstorage.admin',
    ready: 'h2',
    w: 400,
    h: 900,
  },
  {
    name: 'permission-detail',
    page: 'sidepanel',
    hash: '#/permission/storage.objects.get',
    ready: 'article',
    w: 400,
    h: 800,
  },
  { name: 'options', page: 'options', hash: '', ready: 'main', w: 960, h: 800 },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const shot of SHOTS) {
    test(`${shot.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: shot.w, height: shot.h });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/${shot.page}.html${shot.hash}`);
      await page.waitForSelector(shot.ready);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
      );
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `${shot.name}-${scheme}.png`) });
    });
  }
}
