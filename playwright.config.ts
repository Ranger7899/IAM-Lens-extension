import { defineConfig } from '@playwright/test';

// Screenshot capture is opt-in: `npm run shots` (sets SCREENSHOTS=1). The default run skips it.
const shots = !!process.env.SCREENSHOTS;
// Web Store listing images (`npm run store:assets`) are opt-in too.
const store = !!process.env.STORE_ASSETS;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: [
    ...(shots ? [] : ['**/screenshots.spec.ts', '**/shots-*.spec.ts']),
    ...(store ? [] : ['**/store-assets.spec.ts']),
  ],
  // Per-ticket screenshot specs live in e2e/shots-<KEY>.spec.ts; run one with
  // `SCREENSHOTS=1 npx playwright test shots-IAM-9`.
  testMatch: store
    ? ['**/store-assets.spec.ts']
    : shots
      ? ['**/screenshots.spec.ts', '**/shots-*.spec.ts']
      : undefined,
  timeout: shots || store ? 120_000 : 30_000,
  workers: 1, // one persistent-context browser at a time
  // Shared CI runners are 2-3x slower: give UI waits more time and allow one retry there only.
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  // Per-worker output dirs (IAM_TEST_OUT=test-results-IAM-9) so parallel runs don't wipe each other.
  outputDir: process.env.IAM_TEST_OUT ?? 'test-results',
  use: { trace: 'retain-on-failure' },
});
