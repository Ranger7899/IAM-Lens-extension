import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  EmptyState,
  Fab,
  Icon,
  LensMark,
  List,
  ListItem,
  Monogram,
  PermissionToken,
  PrivilegeBar,
  SearchBar,
  SourceBadge,
  StageChip,
  TopAppBar,
  type ExampleQuery,
} from '@/ui/components';
import { IamGate, useIam } from '@/ui/data';
import { useThemePreference } from '@/ui/theme/useThemePreference';
import type { Route } from '@/entrypoints/sidepanel/routes';
import { handOff } from './handoff';
import { routeOf, topResults, type PopupResult } from './results';
import styles from './App.module.css';

function parseHash(hash: string): string {
  return new URLSearchParams(hash.replace(/^#\/?(search)?\??/, '')).get('q') ?? '';
}

export function App() {
  useThemePreference();
  const [query, setQuery] = useState(() => parseHash(location.hash));
  // Resolved ahead of time so the click handler can call sidePanel.open() synchronously
  // (the call must happen inside the user gesture).
  const windowId = useRef<number | undefined>(undefined);

  useEffect(() => {
    void chrome.windows
      .getCurrent()
      .then((w) => {
        windowId.current = w.id;
      })
      .catch(() => {});
  }, []);

  const open = (route: Route) => {
    void handOff(route, windowId.current).finally(() => window.close());
  };

  return (
    <main className={`${styles.root} dot-grid`}>
      <TopAppBar
        title="IAM Lens"
        leading={
          <span className={styles.mark}>
            <LensMark size={26} />
          </span>
        }
      />
      <IamGate>
        <Body query={query} setQuery={setQuery} open={open} />
      </IamGate>
      <Fab
        className={styles.fab}
        icon="side_navigation"
        label="Open side panel"
        onClick={() => open({ name: 'search', query: query.trim() })}
      />
    </main>
  );
}

function Body({
  query,
  setQuery,
  open,
}: {
  query: string;
  setQuery: (q: string) => void;
  open: (r: Route) => void;
}) {
  const { index } = useIam();
  const deferred = useDeferredValue(query);
  const results = useMemo(() => (index ? topResults(index, deferred) : []), [index, deferred]);
  // Selection is tied to the result list it was made in, so a new list starts back at the top.
  const [sel, setSel] = useState<{ of: PopupResult[]; i: number }>({ of: results, i: 0 });
  const active = sel.of === results ? sel.i : 0;
  const setActive = (f: (a: number) => number) => setSel({ of: results, i: f(active) });
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelectorAll('li')[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  const examples = useMemo<ExampleQuery[]>(() => {
    const out: ExampleQuery[] = [];
    const p = 'storage.objects.get';
    const pi = index?.permissionIndex(p);
    if (index && pi !== undefined) out.push({ text: p, kind: 'permission', risk: index.classOf(pi) });
    if (index?.role('roles/run.invoker')) out.push({ text: 'roles/run.invoker', kind: 'role' });
    out.push({ text: 'bigquery admin', kind: 'phrase' });
    return out;
  }, [index]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) open(routeOf(r));
    } else if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    }
  };

  const q = deferred.trim();
  return (
    <div className={styles.body}>
      <SearchBar
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKey}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      {results.length > 0 ? (
        <div ref={list} className={styles.results}>
          <List label="Top results">
            {results.map((r, i) => (
              <Row key={`${r.kind}:${r.id}`} r={r} i={i} active={i === active} open={open} />
            ))}
          </List>
          <p className={styles.live} role="status">
            {results.length} top results. Use up and down arrows, Enter to open in the side panel.
          </p>
        </div>
      ) : q ? (
        <EmptyState
          title={`No results for “${q}”`}
          hint="Check the spelling or search by service name."
          examples={examples.filter((e) => e.kind !== 'permission')}
          onPick={setQuery}
        />
      ) : (
        <EmptyState
          title="Look up any permission or role"
          hint="Tap an example to try it, or just start typing."
          examples={examples}
          onPick={setQuery}
        />
      )}
    </div>
  );
}

function Row({
  r,
  i,
  active,
  open,
}: {
  r: PopupResult;
  i: number;
  active: boolean;
  open: (r: Route) => void;
}) {
  if (r.kind === 'role') {
    const n = r.counts.read + r.counts.write + r.counts.admin;
    return (
      <ListItem
        index={i}
        selected={active}
        onClick={() => open(routeOf(r))}
        leading={<Monogram id={r.id} size={36} />}
        headline={
          <span className={styles.title}>
            <span className={styles.titleText}>{r.title}</span>
            {r.customParent && <SourceBadge parent={r.customParent} />}
            {r.stage !== 'GA' && <StageChip stage={r.stage as 'BETA' | 'ALPHA' | 'DEPRECATED'} />}
          </span>
        }
        supporting={<span className={styles.mono}>{r.id}</span>}
        trailing={<span className={styles.num}>{n.toLocaleString('en-US')}</span>}
        extra={<PrivilegeBar {...r.counts} legend={false} size="thin" />}
      />
    );
  }
  return (
    <ListItem
      index={i}
      selected={active}
      onClick={() => open(routeOf(r))}
      leading={
        <span className={styles.permTile} aria-hidden="true">
          <Icon name="key" size={20} />
        </span>
      }
      headline={
        <span className={styles.tokenWrap}>
          <PermissionToken permission={r.id} risk={r.risk} static />
        </span>
      }
      supporting={`granted by ${r.grantedBy.toLocaleString('en-US')} ${r.grantedBy === 1 ? 'role' : 'roles'}`}
    />
  );
}
