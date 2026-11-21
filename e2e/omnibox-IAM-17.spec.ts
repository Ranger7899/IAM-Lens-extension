import { expect, test } from './fixtures';

test('sidepanel.html deep link (no leading slash) renders role detail as a full tab', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html#role/roles/viewer`);
  await expect(page.getByRole('heading', { name: /viewer/i }).first()).toBeVisible();
});
