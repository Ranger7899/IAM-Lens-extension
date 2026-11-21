/** Omnibox (`iam <query>`) and context-menu lookups: routing decisions, suggestions, side-panel hand-off. */
import { IamIndex, classifyQuery, loadSnapshot } from '@/core';
import { topResults } from '@/entrypoints/popup/results';
import { routeHref, type Route } from '@/entrypoints/sidepanel/routes';
import { writePendingRoute } from '@/ui/data/pendingRouteStore';

export const MENU_ID = 'iam-lens-lookup';
export const MAX_SUGGESTIONS = 5;

/** Where a free-text lookup should land. */
export function routeForQuery(text: string): Route {
  const q = text.trim();
  const parsed = classifyQuery(q);
  switch (parsed.kind) {
    case 'role':
      return { name: 'role', id: parsed.id };
    case 'permission':
      return parsed.partial ? { name: 'search', query: q } : { name: 'permission', id: parsed.permission };
    case 'multi':
      return { name: 'minimal', perms: parsed.perms };
    default:
      return { name: 'search', query: q };
  }
}

/** `chrome-extension://<id>/sidepanel.html#/role/...` target used when the side panel cannot be opened. */
export const fallbackUrl = (route: Route, base = chrome.runtime.getURL('sidepanel.html')): string =>
  base + routeHref(route);

// ---- lazily built, module-cached index (a restarted service worker re-runs this on first use) ----
let indexPromise: Promise<IamIndex> | undefined;
export function getIndex(load: () => Promise<IamIndex> = defaultLoad): Promise<IamIndex> {
  indexPromise ??= load().catch((e) => {
    indexPromise = undefined; // retry next time
    throw e;
  });
  return indexPromise;
}
export const resetIndexForTests = () => {
  indexPromise = undefined;
};
async function defaultLoad(): Promise<IamIndex> {
  const { snapshot } = await loadSnapshot();
  return new IamIndex(snapshot);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface Suggestion {
  content: string;
  description: string;
}

export async function suggestionsFor(text: string, index?: IamIndex): Promise<Suggestion[]> {
  if (!text.trim()) return [];
  const idx = index ?? (await getIndex());
  return topResults(idx, text, MAX_SUGGESTIONS).map((r) =>
    r.kind === 'role'
      ? { content: r.id, description: `<match>${esc(r.id)}</match> <dim>${esc(r.title)}</dim>` }
      : {
          content: r.id,
          description: `<match>${esc(r.id)}</match> <dim>permission, granted by ${r.grantedBy}</dim>`,
        },
  );
}

/**
 * Writes the pending route, then opens the side panel. Must be called synchronously from the gesture handler
 * (no await before `sidePanel.open`). Resolves `'panel'` or, when open() rejects (no user gesture), opens the
 * panel page in a tab and resolves `'tab'`.
 */
export async function openRoute(
  route: Route,
  target: { tabId?: number; windowId?: number },
): Promise<'panel' | 'tab'> {
  const stored = writePendingRoute(route).catch(() => {});
  try {
    const opts =
      target.tabId !== undefined ? { tabId: target.tabId } : { windowId: target.windowId as number };
    await chrome.sidePanel.open(opts);
    await stored;
    return 'panel';
  } catch {
    await stored;
    await chrome.tabs.create({ url: fallbackUrl(route) });
    return 'tab';
  }
}

export function registerOmnibox(): void {
  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    void suggestionsFor(text)
      .then(suggest)
      .catch(() => suggest([]));
  });

  chrome.omnibox.onInputEntered.addListener((text) => {
    const route = routeForQuery(text);
    // sidePanel.open needs a gesture and a target; ask for the active tab without awaiting before open().
    void chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => openRoute(route, { tabId: tab?.id, windowId: tab?.windowId }))
      .catch(() => {});
  });
}

export function registerContextMenu(): void {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Look up “%s” in IAM Lens',
      contexts: ['selection'],
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID) return;
    const route = routeForQuery(info.selectionText ?? '');
    void openRoute(route, { tabId: tab?.id, windowId: tab?.windowId });
  });
}
