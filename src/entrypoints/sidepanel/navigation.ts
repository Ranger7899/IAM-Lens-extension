import { createContext, useContext } from 'react';
import { routeHref, type Route } from './routes';

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

export interface NavigationApi {
  /** Forward navigation to `route`. */
  go: (route: Route, opts?: NavigateOptions) => void;
  /** Backward navigation (history pop; Search when there is no history). */
  back: () => void;
  /** Hash href for `route`, for plain `<a href>` links (those count as forward). */
  href: (route: Route) => string;
}

/** Fallback when no router is mounted (isolated screen tests): drives the hash directly. */
const standalone: NavigationApi = {
  go(route, opts) {
    const h = routeHref(route);
    if (opts?.replace) location.replace(h);
    else location.hash = h;
  },
  back() {
    history.back();
  },
  href: routeHref,
};

export const NavigationContext = createContext<NavigationApi>(standalone);

export function useNavigate(): NavigationApi {
  return useContext(NavigationContext);
}
