import { createContext, useContext, type AnchorHTMLAttributes } from 'react';
import { routeHref, type Route } from '@/entrypoints/sidepanel/routes';

/**
 * How a role / permission link behaves. Inside the side panel the default plain `#/...` link navigates;
 * on the options page the host provides an opener that hands the route to the side panel.
 */
const OpenRouteContext = createContext<((route: Route) => void) | undefined>(undefined);
export const OpenRouteProvider = OpenRouteContext.Provider;

export function RouteLink({
  route,
  ...rest
}: { route: Route } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'>) {
  const open = useContext(OpenRouteContext);
  return (
    <a
      {...rest}
      href={routeHref(route)}
      onClick={
        open
          ? (e) => {
              e.preventDefault();
              open(route); // synchronous: sidePanel.open needs the user gesture
            }
          : undefined
      }
    />
  );
}
