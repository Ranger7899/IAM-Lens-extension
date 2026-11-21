import { defineConfig } from '@playwright/test';

// Screenshot capture is opt-in: `npm run shots` (sets SCREENSHOTS=1). The default run skips it.
const shots = !!process.env.SCREENSHOTS;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: shots ? undefined : '**/screenshots.spec.ts',
  testMatch: shots ? '**/screenshots.spec.ts' : undefined,
  timeout: shots ? 120_000 : 30_000,
  workers: 1, // one persistent-context browser at a time
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
});
