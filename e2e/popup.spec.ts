import { expect, test } from './fixtures';

test('popup: typing a permission lists real results with previews; keyboard selects; fits the frame', async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 380, height: 560 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const box = page.getByRole('searchbox');
  await box.fill('storage.objects.get');
  const rows = page.getByRole('list', { name: 'Top results' }).locator('li');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeLessThanOrEqual(8);
  await expect(page.getByText(/granted by \d+ roles?/).first()).toBeVisible();
  await expect(rows.first().getByRole('button')).toHaveAttribute('aria-current', 'true');

  await box.press('ArrowDown');
  await expect(rows.nth(1).getByRole('button')).toHaveAttribute('aria-current', 'true');
  await box.press('ArrowUp');
  await expect(rows.first().getByRole('button')).toHaveAttribute('aria-current', 'true');

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    body: document.body.scrollHeight - document.body.clientHeight,
  }));
  expect(overflow.doc).toBeLessThanOrEqual(0);
  expect(overflow.body).toBeLessThanOrEqual(0);

  // Enter hands off: pendingRoute is written (sidePanel.open itself needs a real gesture; it is best-effort here).
  await page.evaluate(() => (window.close = () => {}));
  await box.press('Enter');
  await expect
    .poll(() =>
      page.evaluate(async () => (await chrome.storage.session.get('pendingRoute')).pendingRoute?.route),
    )
    .toEqual({ name: 'permission', id: 'storage.objects.get' });
});

test('popup: FAB hands off the current query', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.evaluate(() => (window.close = () => {}));
  await page.getByRole('searchbox').fill('bigquery admin');
  await page.getByRole('button', { name: 'Open side panel' }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => (await chrome.storage.session.get('pendingRoute')).pendingRoute?.route),
    )
    .toEqual({ name: 'search', query: 'bigquery admin' });
});
