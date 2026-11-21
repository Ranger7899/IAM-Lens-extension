import { expect, loadSnapshot, readPendingRoute, sidepanelUrl, test } from './fixtures';

const snap = loadSnapshot();
const role = (name: string) => {
  const r = snap.roles.find((x) => x.name === name);
  if (!r) throw new Error(`snapshot has no ${name}`);
  return r;
};

test('search storage.objects.get: objectViewer is among the top granting roles and opens with 8 permissions', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId));
  await page.getByRole('searchbox').fill('storage.objects.get');
  await page.getByRole('button', { name: 'Open permission storage.objects.get' }).click();
  const rows = page.getByRole('list', { name: 'Roles granting this permission' }).getByRole('button');
  await expect(rows.first()).toBeVisible();
  // "Top results": ranking is smallest-first, so objectViewer (8 permissions) sits in the first dozen.
  const top = (await rows.allInnerTexts()).slice(0, 15).join('\n');
  expect(top).toContain('roles/storage.objectViewer');

  await rows.filter({ hasText: 'roles/storage.objectViewer' }).first().click();
  const title = role('roles/storage.objectViewer').title;
  await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  await expect(page.locator('strong', { hasText: /^\d[\d,]*$/ }).first()).toHaveText('8');
  expect(role('roles/storage.objectViewer').perms).toHaveLength(8);
});

test('roles/viewer detail shows the permission count from the snapshot', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId, '#/role/roles%2Fviewer'));
  await expect(page.getByRole('heading', { level: 2, name: role('roles/viewer').title })).toBeVisible();
  const expected = role('roles/viewer').perms.length.toLocaleString('en-US');
  await expect(page.locator('strong', { hasText: /^\d[\d,]*$/ }).first()).toHaveText(expected);
});

test('minimal-role finder returns a storage role for storage.objects.get + list', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId, '#/minimal'));
  await page.getByRole('textbox').fill('storage.objects.get\nstorage.objects.list');
  const card = page.locator('article[aria-label]').first();
  await expect(card).toBeVisible();
  await expect(card).toContainText(/roles\/storage\.\w+/);
});

test('compare roles/viewer with roles/editor shows a non-empty "Only in B"', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId, '#/compare?a=roles%2Fviewer&b=roles%2Feditor'));
  const onlyB = page.locator('section[aria-label="Only in B"]');
  await expect(onlyB).toBeVisible();
  const count = onlyB.locator('[aria-label$=" permissions"]').first();
  await expect(count).not.toHaveAttribute('aria-label', /^0 permissions$/);
  const n = Number((await count.getAttribute('aria-label'))!.split(' ')[0]!.replace(/,/g, ''));
  expect(n).toBeGreaterThan(0);
});

test('deep link sidepanel.html#/permission/iam.serviceAccounts.actAs opens the permission detail', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId, '#/permission/iam.serviceAccounts.actAs'));
  await expect(page.getByRole('article', { name: 'iam.serviceAccounts.actAs' })).toBeVisible();
  await expect(page.getByText('Least privilege')).toBeVisible();
});

test('deep link without a slash (#permission/...) also resolves', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId, '#permission/iam.serviceAccounts.actAs'));
  await expect(page.getByRole('article', { name: 'iam.serviceAccounts.actAs' })).toBeVisible();
});

test('popup: search then pick a result sets pendingRoute', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.evaluate(() => (window.close = () => {}));
  await page.getByRole('searchbox').fill('storage.objects.get');
  const rows = page.getByRole('list', { name: 'Top results' }).locator('li');
  await expect(rows.first()).toBeVisible();
  await rows.first().getByRole('button').click();
  await expect
    .poll(() => readPendingRoute(page))
    .toMatchObject({ name: expect.stringMatching(/^(role|permission)$/) });
});

test('offline: with the network blocked the bundled snapshot still loads and searches', async ({
  context,
  extensionId,
}) => {
  await context.route('**/*', (route) =>
    route.request().url().startsWith('chrome-extension://') ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  await page.goto(sidepanelUrl(extensionId));
  await page.getByRole('searchbox').fill('storage.objects.get');
  await page.getByRole('tab', { name: /^Roles/ }).click();
  const rows = page.getByRole('list', { name: 'Roles' }).getByRole('button');
  await expect(rows.first()).toBeVisible();
  await rows.first().click();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  await page.goto(sidepanelUrl(extensionId, '#/role/roles%2Fviewer'));
  await expect(page.getByRole('heading', { level: 2, name: role('roles/viewer').title })).toBeVisible();
});
