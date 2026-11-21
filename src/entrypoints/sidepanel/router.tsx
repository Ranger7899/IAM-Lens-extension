/**
 * Side-panel router. Hash based (`#/role/roles%2Fstorage.admin`) so browser history gives us back
 * navigation for free; every route renders one file in ./screens inside a shared-axis transition.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton, LensMark, SegmentedButton, TopAppBar, type IconName } from '@/ui/components';
import { IamGate } from '@/ui/data';
import { navigateWithTransition, type NavDirection } from '@/ui/motion/navigate';
import { CompareScreen } from './screens/CompareScreen';
import { MinimalScreen } from './screens/MinimalScreen';
import { PermissionScreen } from './screens/PermissionScreen';
import { RoleScreen } from './screens/RoleScreen';
import { SearchScreen } from './screens/SearchScreen';
import { WhatsNewScreen } from './screens/WhatsNewScreen';
import styles from './App.module.css';

export type Route =
  | { name: 'search'; query: string }
  | { name: 'role'; id: string }
  | { name: 'permission'; id: string }
  | { name: 'minimal' }
  | { name: 'compare' }
  | { name: 'whatsnew' };

export type TopLevelRoute = 'search' | 'minimal' | 'compare' | 'whatsnew';

export function parseRoute(hash: string): Route {
  const [path = '', qs = ''] = hash.replace(/^#\/?/, '').split('?');
  const [head = '', ...rest] = path.split('/');
  const arg = rest.length ? decodeURIComponent(rest.join('/')) : '';
  switch (head) {
    case 'role':
      if (arg) return { name: 'role', id: arg };
      break;
    case 'permission':
      if (arg) return { name: 'permission', id: arg };
      break;
    case 'minimal':
    case 'compare':
    case 'whatsnew':
      return { name: head };
  }
  return { name: 'search', query: new URLSearchParams(qs).get('q') ?? '' };
}

export function routeHref(r: Route): string {
  switch (r.name) {
    case 'search':
      return r.query ? `#/search?q=${encodeURIComponent(r.query)}` : '#/search';
    case 'role':
      return `#/role/${encodeURIComponent(r.id)}`;
    case 'permission':
      return `#/permission/${encodeURIComponent(r.id)}`;
    default:
      return `#/${r.name}`;
  }
}

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

export interface Navigator {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
}

export function useHashRoute(): Navigator {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  // Set by `go`; a hashchange without it came from history (back/forward).
  const pending = useRef({ forward: false });

  useEffect(() => {
    const onChange = () => {
      const dir: NavDirection = pending.current.forward ? 'forward' : 'back';
      pending.current.forward = false;
      navigateWithTransition(() => setRoute(parseRoute(location.hash)), dir);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = useCallback((r: Route) => {
    const href = routeHref(r);
    if (href === location.hash || (href === '#/search' && location.hash === '')) return;
    pending.current.forward = true;
    location.hash = href;
  }, []);
  const back = useCallback(() => {
    // Opened straight on a detail route (no history to pop): fall back to Search.
    if (history.length > 1) history.back();
    else go({ name: 'search', query: '' });
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

  return { route, go, back };
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'search':
      return <SearchScreen query={route.query} />;
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
  const { route, go, back } = useHashRoute();
  const detail = isDetail(route);
  return (
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
            <Screen route={route} />
          </IamGate>
        </div>
      </main>
    </div>
  );
}
