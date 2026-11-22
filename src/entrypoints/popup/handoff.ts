import { writePendingRoute } from '@/ui/data';
import type { Route } from '@/entrypoints/sidepanel/routes';

/**
 * Must run synchronously inside the click handler: `sidePanel.open` needs the user gesture, so it is called
 * before anything is awaited. The side panel picks the route up via `storage.onChanged`, and also re-reads storage
 * shortly after mount and on focus (IAM-80), so a panel that mounts before the write lands still gets it. Resolves once the route is stored (then the popup can close).
 */
export async function handOff(route: Route, windowId: number | undefined): Promise<void> {
  const stored = writePendingRoute(route).catch(() => {});
  if (windowId !== undefined) void Promise.resolve(chrome.sidePanel.open({ windowId })).catch(() => {});
  await stored;
}
