import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 1, // one persistent-context browser at a time
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
});
