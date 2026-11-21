/**
 * Side-panel router. Hash based (`#/role/roles%2Fstorage.admin`) so browser history gives us back
 * navigation for free; every route renders one file in ./screens inside a shared-axis transition.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconButton, LensMark, SegmentedButton, TopAppBar, type IconName } from '@/ui/components';
import { IamGate, usePendingRoute } from '@/ui/data';
import { navigateWithTransition, type NavDirection } from '@/ui/motion/navigate';
import { CompareScreen } from './screens/CompareScreen';
import { MinimalScreen } from './screens/MinimalScreen';
import { PermissionScreen } from './screens/PermissionScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SearchScreen } from './screens/SearchScreen';
import { WhatsNewScreen } from './screens/WhatsNewScreen';
import { NavigationContext, useNavigate, type NavigateOptions, type NavigationApi } from './navigation';
import { parseRoute, routeHref, type Route, type TopLevelRoute } from './routes';
import styles from './App.module.css';

export { NavigationContext, useNavigate, parseRoute, routeHref };
export type { Route, TopLevelRoute, NavigationApi, NavigateOptions };

const MODES: { id: TopLevelRoute; label: string; icon: IconName }[] = [
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'minimal', label: 'Minimal', icon: 'target' },
  { id: 'compare', label: 'Compare', icon: 'compare_arrows' },
  { id: 'whatsnew', label: "What's new", icon: 'new_releases' },
];

/** The segment a route belongs to; detail routes are reached from Search. */
export function modeOf(r: Route): TopLevelRoute {
  return r.name === 'role' || r.name === 'permission' ? 'search' : r.name;
}

export function isDetail(r: Route): boolean {
  return r.name === 'role' || r.name === 'permission';
}

export interface Navigator extends NavigationApi {
  route: Route;
}

interface Stamp {
  iamIdx: number;
}
const stampOf = (s: unknown): number | undefined =>
  s && typeof (s as Stamp).iamIdx === 'number' ? (s as Stamp).iamIdx : undefined;

/**
 * Hash route state. Direction comes from intent: `go` = forward, `back` = backward. Every history entry
 * is stamped with an index (history.state), so a traversal (popstate: browser back/forward) is told apart
 * from a fresh hash change; an unstamped change (an external `<a href>`) counts as forward.
 */
export function useHashRoute(): Navigator {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const cur = useRef(0);
  const intent = useRef<{ dir?: NavDirection; replace?: boolean }>({});

  useEffect(() => {
    cur.current = stampOf(history.state) ?? 0;
    history.replaceState({ ...(history.state ?? {}), iamIdx: cur.current }, '');
    const onChange = () => {
      const i = intent.current;
      intent.current = {};
      const idx = stampOf(history.state);
      let dir: NavDirection;
      if (idx !== undefined) {
        // Traversal to an entry we stamped earlier.
        dir = i.dir ?? (idx < cur.current ? 'back' : 'forward');
        cur.current = idx;
      } else {
        dir = i.dir ?? 'forward';
        if (!i.replace) cur.current += 1;
        history.replaceState({ ...(history.state ?? {}), iamIdx: cur.current }, '');
      }
      navigateWithTransition(() => setRoute(parseRoute(location.hash)), dir);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((r: Route, opts?: NavigateOptions) => {
    const href = routeHref(r);
    if (href === location.hash || (href === '#/search' && location.hash === '')) return;
    intent.current = { dir: 'forward', replace: opts?.replace };
    if (opts?.replace) location.replace(href);
    else location.hash = href;
  }, []);
  const back = useCallback(() => {
    // Opened straight on a detail route (no history to pop): fall back to Search.
    if (cur.current > 0 || history.length > 1) {
      intent.current = { dir: 'back' };
      history.back();
    } else go({ name: 'search', query: '' });
  }, [go]);

  // Alt+Left = back (the side panel has no browser chrome). Option+Left edits text on macOS, so skip fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.key !== 'ArrowLeft' || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);

  return { route, go, back, href: routeHref };
}

function Screen({ route, go }: { route: Route; go: NavigationApi['go'] }) {
  switch (route.name) {
    case 'search':
      return <SearchScreen query={route.query} go={go} />;
    case 'role':
      return <RoleScreen name={route.id} />;
    case 'permission':
      return <PermissionScreen name={route.id} />;
    case 'minimal':
      return <MinimalScreen />;
    case 'compare':
      return <CompareScreen />;
    case 'whatsnew':
      return <WhatsNewScreen />;
  }
}

export function SidePanelRouter() {
  const { route, go, back, href } = useHashRoute();
  const api = useMemo<NavigationApi>(() => ({ go, back, href }), [go, back, href]);
  usePendingRoute(go); // popup hand-off (IAM-15)
  // Back arrow only where there is somewhere to go back to; the root Search route shows the mark.
  const detail = isDetail(route);
  return (
    <NavigationContext.Provider value={api}>
    <div className={`${styles.root} dot-grid`}>
      <TopAppBar
        title="IAM Lens"
        leading={
          detail ? (
            <IconButton icon="arrow_back" label="Back" onClick={back} />
          ) : (
            <span className={styles.mark}>
              <LensMark size={28} />
            </span>
          )
        }
        actions={
          <IconButton
            icon="settings"
            label="Settings"
            onClick={() => void chrome.runtime.openOptionsPage()}
          />
        }
      >
        <SegmentedButton
          label="Mode"
          segments={MODES}
          value={modeOf(route)}
          onChange={(id) => {
            if (id === 'search') go({ name: 'search', query: '' });
            else go({ name: id as 'minimal' | 'compare' | 'whatsnew' });
          }}
        />
      </TopAppBar>
      <main className={styles.main}>
        <div className={`${styles.view} route-view`}>
          <IamGate>
            <Screen route={route} go={go} />
          </IamGate>
        </div>
      </main>
    </div>
    </NavigationContext.Provider>
  );
}
