// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamIndex } from '@/core';
import { PENDING_ROUTE_KEY, takePendingRoute, subscribePendingRoute } from '@/ui/data';
import { handOff } from './handoff';
import { topResults } from './results';

let store: Record<string, unknown>;
let listeners: Array<(c: Record<string, unknown>, a: string) => void>;
const sidePanelOpen = vi.fn(async () => {});

beforeEach(() => {
  store = {};
  listeners = [];
  sidePanelOpen.mockClear();
  vi.stubGlobal('chrome', {
    storage: {
      session: {
        set: async (o: Record<string, unknown>) => {
          Object.assign(store, o);
          for (const l of listeners)
            l(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { newValue: v }])), 'session');
        },
        get: async (k: string) => (k in store ? { [k]: store[k] } : {}),
        remove: async (k: string) => void delete store[k],
      },
      onChanged: {
        addListener: (l: never) => listeners.push(l),
        removeListener: (l: never) => void (listeners = listeners.filter((x) => x !== l)),
      },
    },
    sidePanel: { open: sidePanelOpen },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('pendingRoute hand-off', () => {
  it('writes {route}, opens the side panel for the window, and the panel consumes it once', async () => {
    const seen = vi.fn();
    const off = subscribePendingRoute(seen);
    await handOff({ name: 'permission', id: 'storage.objects.get' }, 7);
    expect(sidePanelOpen).toHaveBeenCalledWith({ windowId: 7 });
    expect((store[PENDING_ROUTE_KEY] as { route: unknown }).route).toEqual({
      name: 'permission',
      id: 'storage.objects.get',
    });
    expect(seen).toHaveBeenCalledTimes(1);
    expect(await takePendingRoute()).toEqual({ name: 'permission', id: 'storage.objects.get' });
    expect(await takePendingRoute()).toBeUndefined();
    off();
    expect(listeners).toHaveLength(0);
  });

  it('ignores stale or malformed values', async () => {
    store[PENDING_ROUTE_KEY] = { route: { name: 'role', id: 'roles/x' }, at: Date.now() - 10 * 60_000 };
    expect(await takePendingRoute()).toBeUndefined();
    store[PENDING_ROUTE_KEY] = { route: { name: 'bogus' } };
    expect(await takePendingRoute()).toBeUndefined();
  });
});

describe('topResults', () => {
  it('mixes roles and permissions, at most 8, with grant counts', async () => {
    const snap = await makeSnapshot([
      { name: 'roles/storage.viewer', perms: ['storage.objects.get', 'storage.objects.list'] },
      { name: 'roles/storage.admin', perms: ['storage.objects.get', 'storage.objects.delete'] },
    ]);
    const res = topResults(new IamIndex(snap), 'storage.objects.get');
    expect(res.length).toBeLessThanOrEqual(8);
    const perm = res.find((r) => r.kind === 'permission' && r.id === 'storage.objects.get');
    expect(perm).toMatchObject({ grantedBy: 2 });
    expect(res[0]).toMatchObject({ kind: 'permission', id: 'storage.objects.get' });
    expect(topResults(new IamIndex(snap), '  ')).toEqual([]);
  });
});
