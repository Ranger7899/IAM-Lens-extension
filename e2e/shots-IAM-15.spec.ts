/** IAM-15 popup screenshots: `IAM_OUT_DIR=.output-IAM-15 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-15`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-15');
const SHOTS = [
  { name: 'empty', q: '' },
  { name: 'permission', q: 'storage.objects.get' },
  { name: 'role', q: 'bigquery admin' },
  { name: 'no-results', q: 'zzqqxx' },
  { name: 'keyboard', q: 'storage.objects.get', down: 2 },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 380, height: 560 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      if (s.q) await page.getByRole('searchbox').fill(s.q);
      else await page.getByRole('searchbox').focus();
      for (let i = 0; i < (s.down ?? 0); i++) await page.keyboard.press('ArrowDown');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `${s.name}-${scheme}.png`) });
    });
  }
}
