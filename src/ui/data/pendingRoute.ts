/**
 * Popup -> side panel hand-off. The popup writes `{route}` to `chrome.storage.session` (key `pendingRoute`)
 * and opens the side panel; the panel reads it on mount and on `storage.onChanged`, navigates, and clears it.
 */
import { useEffect } from 'react';
import type { Route } from '@/entrypoints/sidepanel/routes';
import { subscribePendingRoute, takePendingRoute } from './pendingRouteStore';

export * from './pendingRouteStore';

const RECHECK_MS = [150, 400, 1000];

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
    // Belt and braces for a freshly opened panel: re-check when it becomes visible or focused, and shortly
    // after mount, in case a write landed in a window where neither the mount read nor onChanged saw it.
    const onVisible = () => {
      if (document.visibilityState === 'visible') apply();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', apply);
    const timers = RECHECK_MS.map((ms) => setTimeout(apply, ms));
    return () => {
      live = false;
      off();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', apply);
      timers.forEach(clearTimeout);
    };
  }, [go]);
}
