import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const EXTENSION_PATH = path.resolve(
  import.meta.dirname,
  '..',
  process.env.IAM_OUT_DIR ?? '.output',
  'chrome-mv3',
);

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, run) => {
    const userDataDir = mkdtempSync(path.join(tmpdir(), 'iam-lens-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium', // new headless mode, required for extensions
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await run(context);
    await context.close();
  },
  extensionId: async ({ context }, run) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await run(new URL(worker.url()).host);
  },
});

export const expect = test.expect;

export interface SnapshotRole {
  name: string;
  title: string;
  perms: number[];
}
export interface Snapshot {
  permissions: string[];
  roles: SnapshotRole[];
}

/** The bundled snapshot, read from disk so tests can compare the UI against ground truth at runtime. */
export function loadSnapshot(): Snapshot {
  return JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '..', 'data', 'roles.snapshot.json'), 'utf8'),
  );
}

export function sidepanelUrl(extensionId: string, hash = ''): string {
  return `chrome-extension://${extensionId}/sidepanel.html${hash}`;
}

/** Read the popup -> side panel hand-off route from `chrome.storage.session`. */
export async function readPendingRoute(page: Page): Promise<unknown> {
  return page.evaluate(
    async () =>
      ((await chrome.storage.session.get('pendingRoute')).pendingRoute as { route?: unknown } | undefined)
        ?.route,
  );
}
