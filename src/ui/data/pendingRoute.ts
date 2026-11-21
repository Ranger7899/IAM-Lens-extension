/**
 * Popup -> side panel hand-off. The popup writes `{route}` to `chrome.storage.session` (key `pendingRoute`)
 * and opens the side panel; the panel reads it on mount and on `storage.onChanged`, navigates, and clears it.
 */
import { useEffect } from 'react';
import type { Route } from '@/entrypoints/sidepanel/routes';
import { subscribePendingRoute, takePendingRoute } from './pendingRouteStore';

export * from './pendingRouteStore';

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
