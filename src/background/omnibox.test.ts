// @vitest-environment node
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IamIndex, type Snapshot } from '@/core';
import {
  MENU_ID,
  fallbackUrl,
  getIndex,
  openRoute,
  registerContextMenu,
  registerOmnibox,
  resetIndexForTests,
  routeForQuery,
  suggestionsFor,
} from './omnibox';
import { PENDING_ROUTE_KEY } from '@/ui/data/pendingRouteStore';

const snap = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00Z',
  permissions: ['storage.objects.get', 'storage.objects.list'],
  roles: [{ name: 'roles/storage.objectViewer', title: 'Storage Object Viewer', stage: 'GA', perms: [0, 1] }],
} as unknown as Snapshot;

/** Minimal event stand-in (fake-browser has no omnibox/contextMenus events). */
const evt = () => {
  const fns: ((...a: never[]) => void)[] = [];
  return {
    addListener: (f: (...a: never[]) => void) => void fns.push(f),
    trigger: (...a: unknown[]) => fns.forEach((f) => f(...(a as never[]))),
  };
};
let menuClicked = evt();
let inputEntered = evt();
let inputChanged = evt();
const sidePanelOpen = vi.fn(async (...args: unknown[]) => void args);
const tabsCreate = vi.fn(async (...args: unknown[]) => (void args, {}));

beforeEach(() => {
  fakeBrowser.reset();
  resetIndexForTests();
  menuClicked = evt();
  inputEntered = evt();
  inputChanged = evt();
  sidePanelOpen.mockReset().mockResolvedValue(undefined);
  tabsCreate.mockReset().mockResolvedValue({});
  vi.stubGlobal('chrome', {
    ...(fakeBrowser as object),
    storage: fakeBrowser.storage,
    runtime: { ...fakeBrowser.runtime, getURL: (p: string) => `chrome-extension://abc/${p}` },
    sidePanel: { open: sidePanelOpen },
    tabs: { create: tabsCreate, query: vi.fn(async () => [{ id: 3, windowId: 9 }]) },
    omnibox: { onInputChanged: inputChanged, onInputEntered: inputEntered },
    contextMenus: { onClicked: menuClicked, create: vi.fn() },
  });
});

describe('routeForQuery', () => {
  it.each([
    ['roles/viewer', { name: 'role', id: 'roles/viewer' }],
    ['storage.objects.get', { name: 'permission', id: 'storage.objects.get' }],
    ['objects.get', { name: 'search', query: 'objects.get' }],
    ['a.b.c d.e.f', { name: 'minimal', perms: ['a.b.c', 'd.e.f'] }],
    ['  bucket admin ', { name: 'search', query: 'bucket admin' }],
  ])('%s', (q, route) => expect(routeForQuery(q)).toEqual(route));
});

describe('openRoute', () => {
  it('writes pendingRoute then opens the panel for the tab', async () => {
    const r = await openRoute({ name: 'role', id: 'roles/viewer' }, { tabId: 3, windowId: 9 });
    expect(r).toBe('panel');
    expect(sidePanelOpen).toHaveBeenCalledWith({ tabId: 3 });
    expect(tabsCreate).not.toHaveBeenCalled();
    const got = await fakeBrowser.storage.session.get(PENDING_ROUTE_KEY);
    expect((got[PENDING_ROUTE_KEY] as { route: unknown }).route).toEqual({
      name: 'role',
      id: 'roles/viewer',
    });
  });

  it('falls back to a sidepanel.html tab when open() rejects (no gesture)', async () => {
    sidePanelOpen.mockRejectedValue(new Error('may only be called in response to a user gesture'));
    const r = await openRoute({ name: 'role', id: 'roles/viewer' }, { tabId: 3 });
    expect(r).toBe('tab');
    expect(tabsCreate).toHaveBeenCalledWith({
      url: 'chrome-extension://abc/sidepanel.html#/role/roles%2Fviewer',
    });
  });

  it('fallbackUrl builds the hash', () => {
    expect(fallbackUrl({ name: 'search', query: 'x y' }, 'u/sidepanel.html')).toBe(
      'u/sidepanel.html#/search?q=x%20y',
    );
  });
});

describe('suggestions + index cache', () => {
  it('returns at most 5 and loads the index once; reloads after a failed load', async () => {
    const load = vi.fn(async () => new IamIndex(snap));
    expect(await suggestionsFor('', new IamIndex(snap))).toEqual([]);
    const idx = await getIndex(load);
    await getIndex(load);
    expect(load).toHaveBeenCalledTimes(1);
    const s = await suggestionsFor('storage.objects.get', idx);
    expect(s.length).toBeGreaterThan(0);
    expect(s.length).toBeLessThanOrEqual(5);
    resetIndexForTests();
    const bad = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(new IamIndex(snap));
    await expect(getIndex(bad)).rejects.toThrow();
    await expect(getIndex(bad)).resolves.toBeInstanceOf(IamIndex);
  });
});

describe('listeners', () => {
  it('context menu click on a permission selection opens the panel on the permission route', async () => {
    registerContextMenu();
    menuClicked.trigger(
      { menuItemId: MENU_ID, selectionText: 'storage.objects.get', editable: false, pageUrl: '' } as never,
      { id: 5, windowId: 2 } as never,
    );
    await vi.waitFor(() => expect(sidePanelOpen).toHaveBeenCalledWith({ tabId: 5 }));
    const got = await fakeBrowser.storage.session.get(PENDING_ROUTE_KEY);
    expect((got[PENDING_ROUTE_KEY] as { route: unknown }).route).toEqual({
      name: 'permission',
      id: 'storage.objects.get',
    });
  });

  it('ignores other menu ids', () => {
    registerContextMenu();
    menuClicked.trigger({ menuItemId: 'other' } as never, { id: 5 } as never);
    expect(sidePanelOpen).not.toHaveBeenCalled();
  });

  it('omnibox entered routes via the active tab; falls back to a tab on rejection', async () => {
    registerOmnibox();
    inputEntered.trigger('roles/viewer', 'currentTab');
    await vi.waitFor(() => expect(sidePanelOpen).toHaveBeenCalledWith({ tabId: 3 }));
    sidePanelOpen.mockRejectedValue(new Error('gesture'));
    inputEntered.trigger('roles/viewer', 'currentTab');
    await vi.waitFor(() => expect(tabsCreate).toHaveBeenCalled());
  });
});
