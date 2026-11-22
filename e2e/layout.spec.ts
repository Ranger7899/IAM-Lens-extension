import { expect, test } from './fixtures';

const sidepanelUrl = (id: string, hash: string) => `chrome-extension://${id}/sidepanel.html${hash}`;

// Only <main> scrolls. The document itself must never overflow, or a second scrollbar appears
// and the panel scrolls off the top, leaving an empty band below.
for (const [name, hash, input] of [
  ['minimal', '#/minimal', 'storage.objects.get\nstorage.objects.list\npubsub.topics.publish\nlogging.logEntries.create\ncompute.instances.list'],
  ['role', '#/role/roles%2Feditor', null],
  ['compare', '#/compare?a=roles%2Fviewer&b=roles%2Feditor', null],
] as const) {
  test(`layout: document does not scroll on ${name}`, async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 380, height: 700 });
    await page.goto(sidepanelUrl(extensionId, hash));
    if (input) await page.getByRole('textbox').fill(input);
    await expect(page.locator('main article, main section').first()).toBeVisible();
    await page.locator('main').evaluate((m) => m.scrollTo(0, m.scrollHeight));
    const o = await page.evaluate(() => ({
      overflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      scrollY: window.scrollY,
    }));
    expect(o.overflow).toBeLessThanOrEqual(0);
    expect(o.scrollY).toBe(0);
  });
}
