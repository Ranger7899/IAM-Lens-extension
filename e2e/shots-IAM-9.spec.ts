import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-9');
const SHOTS = [
  { name: 'empty', q: '' },
  { name: 'storage', q: 'storage' },
  { name: 'storage-objects-get', q: 'storage.objects.get' },
  { name: 'no-results', q: 'zzqqxx' },
  { name: 'paste', q: 'storage.objects.get storage.objects.list' },
  { name: 'role-id', q: 'roles/storage.admin' },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.setViewportSize({ width: 400, height: 800 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(
        `chrome-extension://${extensionId}/sidepanel.html#/search${s.q ? `?q=${encodeURIComponent(s.q)}` : ''}`,
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${s.name}-${scheme}.png`) });
    });
  }
}
