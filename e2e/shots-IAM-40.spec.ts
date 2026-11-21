/** IAM-40 screenshots (Shield lens mark): `IAM_OUT_DIR=.output-IAM-40 IAM_TEST_OUT=test-results-IAM-40 SCREENSHOTS=1 npx playwright test shots-IAM-40`. */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from './fixtures';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'docs', 'screens', 'IAM-40');
const png = (n: number) => `data:image/png;base64,${readFileSync(path.join(ROOT, 'public', 'icon', `${n}.png`)).toString('base64')}`;

test.beforeAll(() => {
  if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
  mkdirSync(OUT, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`sidepanel header (${scheme})`, async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 400, height: 300 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForSelector('[role=tablist]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `sidepanel-header-${scheme}.png`) });
  });

  test(`popup (${scheme})`, async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 400, height: 420 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.waitForSelector('svg');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `popup-${scheme}.png`) });
  });

  test(`options header and about (${scheme})`, async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 960, height: 900 });
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.waitForSelector('main');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `options-${scheme}.png`), fullPage: true });
  });

  test(`toolbar icon 16px (${scheme})`, async ({ context }) => {
    const bg = scheme === 'light' ? '#ffffff' : '#282c32';
    const page = await context.newPage();
    await page.setViewportSize({ width: 700, height: 300 });
    await page.setContent(`<body style="margin:0;background:${bg};display:flex;gap:32px;align-items:center;padding:24px">
      <img src="${png(16)}" style="width:256px;height:256px;image-rendering:pixelated">
      <img src="${png(32)}" style="width:256px;height:256px;image-rendering:pixelated">
      <img src="${png(16)}"><img src="${png(32)}"></body>`);
    await page.screenshot({ path: path.join(OUT, `toolbar-icon-${scheme}.png`) });
  });
}
