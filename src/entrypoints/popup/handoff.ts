import { writePendingRoute } from '@/ui/data';
import type { Route } from '@/entrypoints/sidepanel/routes';

/**
 * Must run synchronously inside the click handler: `sidePanel.open` needs the user gesture, so it is called
 * before anything is awaited. The side panel picks the route up via `storage.onChanged`, so the order of the
 * two calls doesn't matter. Resolves once the route is stored (then the popup can close).
 */
export async function handOff(route: Route, windowId: number | undefined): Promise<void> {
  const stored = writePendingRoute(route).catch(() => {});
  if (windowId !== undefined) void Promise.resolve(chrome.sidePanel.open({ windowId })).catch(() => {});
  await stored;
}
