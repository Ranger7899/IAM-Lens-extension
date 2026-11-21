/**
 * Minimal in-memory demo router for the design shells. Later phases replace it with real routing/data;
 * screens in ../screens only take plain props, so swapping is a one-file change per entrypoint.
 * Initial state can be seeded from the URL hash (used by the screenshot tooling):
 *   #q=storage.objects  |  #role=roles/storage.admin  |  #perm=storage.objects.get
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { navigateWithTransition } from '../motion/navigate';

export type Route = { name: 'home' } | { name: 'role'; id: string } | { name: 'permission'; id: string };

export interface DemoRouter {
  route: Route;
  query: string;
  setQuery: (q: string) => void;
  go: (r: Route) => void;
  back: () => void;
}

const HOME: Route = { name: 'home' };

const Ctx = createContext<DemoRouter | null>(null);

export function parseHash(hash: string): { route: Route; query: string } {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const role = p.get('role');
  const perm = p.get('perm');
  const query = p.get('q') ?? '';
  if (role) return { route: { name: 'role', id: role }, query };
  if (perm) return { route: { name: 'permission', id: perm }, query };
  return { route: { name: 'home' }, query };
}

export function DemoRouterProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => parseHash(typeof location === 'undefined' ? '' : location.hash), []);
  const [stack, setStack] = useState<Route[]>(
    initial.route.name === 'home' ? [] : [{ name: 'home' }, initial.route],
  );
  const [query, setQuery] = useState(initial.query);
  const route = stack[stack.length - 1] ?? HOME;

  const go = useCallback((r: Route) => {
    navigateWithTransition(() => setStack((s) => [...s, r]), 'forward');
  }, []);
  const back = useCallback(() => {
    navigateWithTransition(() => setStack((s) => s.slice(0, -1)), 'back');
  }, []);

  const value = useMemo(() => ({ route, query, setQuery, go, back }), [route, query, go, back]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoRouter(): DemoRouter {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemoRouter outside DemoRouterProvider');
  return v;
}
