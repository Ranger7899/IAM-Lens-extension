import { test, expect } from './fixtures';
import { enableSidePanelTabs } from './sidePanelTabs';

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
  await enableSidePanelTabs(context); // Minimal and Compare are opt-in (IAM-43)
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const stub = (t: string | RegExp) => page.getByRole('heading', { level: 2, name: t });
  await expect(page.getByRole('searchbox')).toBeVisible(); // waits out the loading skeleton

  await page.getByRole('tab', { name: 'Compare' }).click();
  await expect(stub('Compare two roles')).toBeVisible();
  await page.getByRole('tab', { name: 'Minimal' }).click();
  await expect(stub('Find minimal roles')).toBeVisible();
  // The side panel has exactly three tabs; What's new lives in Settings (IAM-39).
  await expect(page.getByRole('tab')).toHaveText(['Search', 'Minimal', 'Compare']);

  await page.evaluate(() => (location.hash = '#/role/roles%2Fviewer'));
  await expect(stub('Viewer')).toBeVisible();
  await expect(page.getByText('roles/viewer')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(stub('Find minimal roles')).toBeVisible();

  await page.evaluate(() => (location.hash = '#/permission/storage.objects.get'));
  await expect(stub(/^Roles/)).toBeVisible();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(stub('Find minimal roles')).toBeVisible();

  // Old deep link: a short "moved" stub, no dead route.
  await page.evaluate(() => (location.hash = '#/whatsnew'));
  await expect(stub('What’s new moved to Settings')).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(3);
});

test('side panel tabs are opt-in: Search only by default, three once enabled in Settings storage', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);

  // Deep links still render although the tab is hidden; the active mode's tab shows (a way back to Search).
  await page.evaluate(() => (location.hash = '#/compare'));
  await expect(page.getByRole('heading', { level: 2, name: 'Compare two roles' })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveText(['Search', 'Compare']);

  // Toggling the setting updates the open panel live.
  await enableSidePanelTabs(context);
  await expect(page.getByRole('tab')).toHaveText(['Search', 'Minimal', 'Compare']);
  await enableSidePanelTabs(context, { minimal: false, compare: true });
  await expect(page.getByRole('tab')).toHaveText(['Search', 'Compare']);
  await enableSidePanelTabs(context, { minimal: false, compare: false });
  await page.evaluate(() => (location.hash = '#/search'));
  await expect(page.getByRole('tablist')).toHaveCount(0);
});
