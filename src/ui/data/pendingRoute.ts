/**
 * Popup -> side panel hand-off. The popup writes `{route}` to `chrome.storage.session` (key `pendingRoute`)
 * and opens the side panel; the panel reads it on mount and on `storage.onChanged`, navigates, and clears it.
 */
import { useEffect } from 'react';
import type { Route } from '@/entrypoints/sidepanel/routes';

export const PENDING_ROUTE_KEY = 'pendingRoute';
/** A write older than this is considered stale (the panel was opened by something else later). */
const MAX_AGE_MS = 60_000;

interface Pending {
  route: Route;
  at: number;
}

const ROUTE_NAMES = new Set(['search', 'role', 'permission', 'minimal', 'compare', 'whatsnew']);
const isRoute = (r: unknown): r is Route =>
  !!r && typeof r === 'object' && ROUTE_NAMES.has((r as { name?: string }).name ?? '');

const area = () => (typeof chrome !== 'undefined' ? chrome.storage?.session : undefined);

export async function writePendingRoute(route: Route): Promise<void> {
  const pending: Pending = { route, at: Date.now() };
  await area()?.set({ [PENDING_ROUTE_KEY]: pending });
}

function parse(v: unknown): Route | undefined {
  const p = v as Partial<Pending> | undefined;
  if (!p || !isRoute(p.route)) return undefined;
  if (typeof p.at === 'number' && Date.now() - p.at > MAX_AGE_MS) return undefined;
  return p.route;
}

/** Reads and clears the pending route (undefined when none or stale). */
export async function takePendingRoute(): Promise<Route | undefined> {
  const s = area();
  if (!s) return undefined;
  const got = await s.get(PENDING_ROUTE_KEY);
  const v = got[PENDING_ROUTE_KEY];
  if (v === undefined) return undefined;
  await s.remove(PENDING_ROUTE_KEY);
  return parse(v);
}

/** Calls `cb` whenever a pending route is written. Returns the unsubscribe function. */
export function subscribePendingRoute(cb: () => void): () => void {
  const onChanged = (changes: Record<string, unknown>, areaName: string) => {
    if (areaName === 'session' && PENDING_ROUTE_KEY in changes && (changes[PENDING_ROUTE_KEY] as { newValue?: unknown }).newValue)
      cb();
  };
  chrome.storage?.onChanged?.addListener(onChanged);
  return () => chrome.storage?.onChanged?.removeListener(onChanged);
}

/** Side panel: apply a pending route on mount and whenever one arrives. */
export function usePendingRoute(go: (r: Route) => void) {
  useEffect(() => {
    let live = true;
    const apply = () =>
      void takePendingRoute()
        .then((r) => {
          if (live && r) go(r);
        })
        .catch(() => {});
    apply();
    const off = subscribePendingRoute(apply);
    return () => {
      live = false;
      off();
    };
  }, [go]);
}
