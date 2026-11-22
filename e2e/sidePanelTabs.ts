import type { BrowserContext } from '@playwright/test';

/** Show the opt-in Minimal and Compare tabs (IAM-43) by writing the setting through the extension's service worker. */
export async function enableSidePanelTabs(
  context: BrowserContext,
  tabs = { minimal: true, compare: true },
): Promise<void> {
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent('serviceworker');
  await worker.evaluate((v) => chrome.storage.local.set({ sidePanelTabs: v }), tabs);
}
