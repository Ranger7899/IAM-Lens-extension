/** IAM-34 screenshots (official GCP service icons): `IAM_OUT_DIR=.output-IAM-34 IAM_TEST_OUT=test-results-IAM-34 SCREENSHOTS=1 SKIP_BUILD=1 npx playwright test shots-IAM-34`. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const OUT = path.resolve(import.meta.dirname, '..', 'docs', 'screens', 'IAM-34');
const FIVE = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];
const SHOTS = [
  { name: 'search-storage', hash: '#/search?q=storage', ready: 'main li img' },
  {
    name: 'permission-storage-objects-get',
    hash: '#/permission/storage.objects.get',
    ready: 'article li img',
  },
  {
    name: 'minimal-five',
    hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`,
    ready: 'article img',
  },
];

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const shot of SHOTS) {
  test(`${shot.name} (light)`, async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 400, height: 800 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html${shot.hash}`);
    await page.waitForSelector(shot.ready);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() =>
      [...document.querySelectorAll('img')].every((i) => i.complete && i.naturalWidth > 0),
    );
    await page.waitForTimeout(1100);
    await page.screenshot({ path: path.join(OUT, `${shot.name}-light.png`) });
  });
}
