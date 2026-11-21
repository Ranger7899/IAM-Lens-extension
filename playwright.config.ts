import { defineConfig } from '@playwright/test';

// Screenshot capture is opt-in: `npm run shots` (sets SCREENSHOTS=1). The default run skips it.
const shots = !!process.env.SCREENSHOTS;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: shots ? undefined : ['**/screenshots.spec.ts', '**/shots-*.spec.ts'],
  // Per-ticket screenshot specs live in e2e/shots-<KEY>.spec.ts; run one with
  // `SCREENSHOTS=1 npx playwright test shots-IAM-9`.
  testMatch: shots ? ['**/screenshots.spec.ts', '**/shots-*.spec.ts'] : undefined,
  timeout: shots ? 120_000 : 30_000,
  workers: 1, // one persistent-context browser at a time
  reporter: 'list',
  // Per-worker output dirs (IAM_TEST_OUT=test-results-IAM-9) so parallel runs don't wipe each other.
  outputDir: process.env.IAM_TEST_OUT ?? 'test-results',
  use: { trace: 'retain-on-failure' },
});
