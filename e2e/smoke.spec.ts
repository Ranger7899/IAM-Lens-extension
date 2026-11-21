import { test, expect } from './fixtures';

test('side panel page renders the app title', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.getByRole('heading', { level: 1, name: 'IAM Lens' })).toBeVisible();
});
