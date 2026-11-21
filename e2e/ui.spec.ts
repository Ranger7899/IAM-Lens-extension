import { test, expect } from './fixtures';

test('search -> role detail -> permission detail -> back, with keyboard support', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html?demo=1`);

  // "/" focuses search
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('storage');

  const roles = page.getByRole('list', { name: 'Roles' });
  await expect(roles.getByRole('button')).toHaveCount(6);
  await expect(page.getByRole('img', { name: /read, .* write, .* admin/ }).first()).toBeVisible();

  // Arrow keys move between rows
  await roles.getByRole('button').first().focus();
  await page.keyboard.press('ArrowDown');
  await expect(roles.getByRole('button').nth(1)).toBeFocused();

  await roles.getByRole('button').first().click();
  await expect(page.getByRole('heading', { level: 2, name: 'Storage Admin' })).toBeVisible();
  await page.getByRole('button', { name: /^storage\.buckets\.get,/ }).click();
  await expect(page.getByRole('article', { name: 'storage.buckets.get' })).toBeVisible();
  await expect(page.getByText('Least privilege')).toBeVisible();

  await page.getByRole('button', { name: 'Back to results' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Storage Admin' })).toBeVisible();
});

test('side panel router: segments, detail routes, back button and Alt+Left', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const stub = (t: string | RegExp) => page.getByRole('heading', { level: 2, name: t });
  await expect(page.getByRole('searchbox')).toBeVisible(); // waits out the loading skeleton

  await page.getByRole('radio', { name: 'Compare' }).click();
  await expect(stub('Compare two roles')).toBeVisible();
  await page.getByRole('radio', { name: 'Minimal' }).click();
  await expect(stub('Find minimal roles')).toBeVisible();
  await page.getByRole('radio', { name: "What's new" }).click();
  await expect(stub('Nothing to compare yet')).toBeVisible();

  await page.evaluate(() => (location.hash = '#/role/roles%2Fviewer'));
  await expect(stub('Viewer')).toBeVisible();
  await expect(page.getByText('roles/viewer')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(stub('Nothing to compare yet')).toBeVisible();

  await page.evaluate(() => (location.hash = '#/permission/storage.objects.get'));
  await expect(stub(/^Roles/)).toBeVisible();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(stub('Nothing to compare yet')).toBeVisible();
});
