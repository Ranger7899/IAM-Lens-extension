import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-11');
const SHOTS = [
  { name: 'storage-objects-get', hash: '#/permission/storage.objects.get' },
  { name: 'iam-serviceAccounts-actAs', hash: '#/permission/iam.serviceAccounts.actAs' },
  { name: 'picker', hash: '#/permission/storage.objects.*' },
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
