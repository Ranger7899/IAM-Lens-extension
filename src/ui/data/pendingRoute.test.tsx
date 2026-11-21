// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PENDING_ROUTE_KEY, usePendingRoute } from './pendingRoute';
import type { Route } from '@/entrypoints/sidepanel/routes';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllGlobals());

function Probe({ go }: { go: (r: Route) => void }) {
  usePendingRoute(go);
  return null;
}

describe('usePendingRoute', () => {
  it('applies a route waiting on mount, then one that arrives via storage.onChanged', async () => {
    const store: Record<string, unknown> = {
      [PENDING_ROUTE_KEY]: { route: { name: 'role', id: 'roles/a.viewer' }, at: Date.now() },
    };
    let listener: ((c: Record<string, unknown>, a: string) => void) | undefined;
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: async (k: string) => (k in store ? { [k]: store[k] } : {}),
          remove: async (k: string) => void delete store[k],
        },
        onChanged: { addListener: (l: typeof listener) => (listener = l), removeListener: () => (listener = undefined) },
      },
    });
    const go = vi.fn();
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Probe go={go} />));
    expect(go).toHaveBeenCalledWith({ name: 'role', id: 'roles/a.viewer' });
    expect(store[PENDING_ROUTE_KEY]).toBeUndefined();

    store[PENDING_ROUTE_KEY] = { route: { name: 'permission', id: 'a.b.c' }, at: Date.now() };
    await act(async () => listener?.({ [PENDING_ROUTE_KEY]: { newValue: store[PENDING_ROUTE_KEY] } }, 'session'));
    expect(go).toHaveBeenLastCalledWith({ name: 'permission', id: 'a.b.c' });
    act(() => root.unmount());
    expect(listener).toBeUndefined();
  });
});
