import { defineConfig } from '@playwright/test';

// Opt-in config for the IAM-68 article visuals (see article-shots.spec.ts). Not picked up by the default suite.
export default defineConfig({
  testDir: '.',
  testMatch: ['**/article-shots.spec.ts'],
  timeout: 120_000,
  workers: 1,
  outputDir: process.env.IAM_TEST_OUT ?? 'test-results',
  reporter: 'list',
});
