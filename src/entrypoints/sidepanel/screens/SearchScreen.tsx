import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { classifyQuery, type RoleRecord } from '@/core';
import {
  Button,
  EmptyState,
  Icon,
  List,
  ListItem,
  PermissionToken,
  SearchBar,
  Tabs,
  type ExampleQuery,
} from '@/ui/components';
import { useIam } from '@/ui/data';
import { RoleRow } from '@/ui/screens';
import type { RoleSummary, Stage } from '@/ui/types';
import type { Route } from '../router';
import { highlightTerms, useHighlights } from './search/useHighlights';
import './search/highlight.css';
import styles from './search/SearchScreen.module.css';

const PAGE = 100;
const STAGES = new Set(['GA', 'BETA', 'ALPHA', 'DEPRECATED']);

export interface SearchScreenProps {
  /** Query from the route hash (`#/search?q=`), used as the initial text. */
  query: string;
  go: (r: Route) => void;
}

/** Keeps the query in the hash without adding history entries, so back-navigation restores it. */
function persistQuery(q: string) {
  const href = q ? `#/search?q=${encodeURIComponent(q)}` : '#/search';
  if (location.hash !== href) history.replaceState(history.state, '', href);
}

function toSummary(r: RoleRecord, counts: RoleSummary['counts']): RoleSummary {
  const stage = (r.deleted ? 'DEPRECATED' : STAGES.has(r.stage) ? r.stage : 'GA') as Stage;
  return { id: r.name, title: r.title || r.name, stage, counts, description: r.description };
}

/** A tonal card that jumps straight to an exact match or to the minimal-roles finder. */
function JumpCard({
  eyebrow,
  value,
  onClick,
  enter,
}: {
  eyebrow: string;
  value: ReactNode;
  onClick: () => void;
  enter?: boolean;
}) {
  return (
    <button type="button" className={`${styles.jump} reveal`} onClick={onClick} data-jump>
      <span className={styles.jumpText}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <span className={styles.jumpValue}>{value}</span>
      </span>
      {enter ? (
        <kbd className={styles.enter} aria-hidden="true">
          ↵
        </kbd>
      ) : (
        <Icon name="chevron_right" />
      )}
    </button>
  );
}

export function SearchScreen({ query, go }: SearchScreenProps) {
  const iam = useIam();
  if (iam.status !== 'ready') return null;
  return <SearchBody index={iam.index} initial={query} go={go} />;
}

function SearchBody({
  index,
  initial,
  go,
}: {
  index: NonNullable<ReturnType<typeof useIam>['index']>;
  initial: string;
  go: (r: Route) => void;
}) {
  const [text, setQuery] = useState(initial);
  const [tab, setTab] = useState<'roles' | 'permissions' | null>(null);
  const [shown, setShown] = useState(PAGE);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(text);
  const setText = (v: string) => {
    setQuery(v);
    setShown(PAGE);
    setTab(null);
  };

  // Mirror the query into the URL (debounced; replace, not push).
  useEffect(() => {
    const t = setTimeout(() => persistQuery(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  const parsed = useMemo(() => classifyQuery(deferred), [deferred]);

  const results = useMemo(() => {
    const q = deferred.trim();
    if (!q || parsed.kind === 'multi') return { roles: [], permissions: [] };
    return index.search(q, { limit: 1000 });
  }, [index, deferred, parsed.kind]);

  // Permission-shaped queries land on the Permissions tab, everything else on Roles (until the user picks).
  const auto = parsed.kind === 'permission' ? 'permissions' : 'roles';
  const chosen = tab ?? auto;

  // Prefer the tab that has hits when the other is empty.
  const effectiveTab =
    chosen === 'roles' && !results.roles.length && results.permissions.length
      ? 'permissions'
      : chosen === 'permissions' && !results.permissions.length && results.roles.length
        ? 'roles'
        : chosen;

  const exactRole = parsed.kind === 'role' ? index.role(parsed.id) : undefined;
  const exactPerm =
    parsed.kind === 'permission' && !parsed.partial && index.hasPermission(parsed.permission)
      ? parsed.permission
      : undefined;
  const multi = parsed.kind === 'multi' ? parsed.perms : undefined;

  const terms = useMemo(() => highlightTerms(deferred), [deferred]);
  useHighlights(panel, terms, [effectiveTab, shown, results]);

  const openRole = (name: string) => go({ name: 'role', id: name });
  const openPerm = (p: string) => go({ name: 'permission', id: p });
  const openMinimal = (perms: string[]) => go({ name: 'minimal', perms });

  const inputEl = () => root.current?.querySelector<HTMLInputElement>('input') ?? null;
  const firstRow = () => panel.current?.querySelector<HTMLButtonElement>('ul button') ?? null;

  const clear = () => {
    setText('');
    persistQuery('');
    inputEl()?.focus();
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (exactRole) openRole(exactRole.name);
      else if (exactPerm) openPerm(exactPerm);
      else if (multi) openMinimal(multi);
      else firstRow()?.click();
    } else if (e.key === 'ArrowDown') {
      const next = firstRow();
      if (next) {
        e.preventDefault();
        next.focus();
      }
    } else if (e.key === 'Escape' && text) {
      e.preventDefault();
      clear();
    }
  };

  const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (e.key === 'ArrowUp' && t === firstRow()) {
      e.preventDefault();
      inputEl()?.focus();
    } else if (e.key === 'Escape' && t !== inputEl() && text) {
      e.preventDefault();
      clear();
    }
  };

  const examples = useMemo<ExampleQuery[]>(() => {
    const out: ExampleQuery[] = [];
    const p = 'storage.objects.get';
    const pi = index.permissionIndex(p);
    if (pi !== undefined) out.push({ text: p, kind: 'permission', risk: index.classOf(pi) });
    if (index.role('roles/run.invoker')) out.push({ text: 'roles/run.invoker', kind: 'role' });
    out.push({ text: 'bigquery admin', kind: 'phrase' });
    return out;
  }, [index]);

  const profileOf = (r: RoleRecord) => index.profile(r);
  const list = effectiveTab === 'roles' ? results.roles : results.permissions;
  const visible = list.slice(0, shown);
  const q = deferred.trim();

  let body: ReactNode;
  if (multi) {
    body = (
      <ul className={styles.pasted} aria-label="Pasted permissions">
        {multi.map((p) => {
          const i = index.permissionIndex(p);
          return (
            <li key={p}>
              <PermissionToken permission={p} risk={i === undefined ? undefined : index.classOf(i)} static />
            </li>
          );
        })}
      </ul>
    );
  } else if (!q) {
    body = (
      <EmptyState
        title="Look up any permission or role"
        hint="Find which roles grant a permission, or which permissions a role has."
        examples={examples}
        onPick={setText}
      />
    );
  } else if (!results.roles.length && !results.permissions.length) {
    const first = highlightTerms(q)[0];
    body = (
      <EmptyState
        title={`No results for “${q}”`}
        hint="Check the spelling, use fewer words, or search by service name."
        examples={[
          ...(first && first !== q.toLowerCase() ? [{ text: first, kind: 'phrase' as const }] : []),
          ...examples.filter((e) => e.kind !== 'permission'),
        ]}
        onPick={setText}
      />
    );
  } else {
    body = (
      <div ref={panel} className={styles.panel} role="tabpanel" aria-labelledby={`tab-${effectiveTab}`}>
        {effectiveTab === 'roles' ? (
          <List label="Roles">
            {(visible as typeof results.roles).map((h, i) => (
              <RoleRow
                key={h.role.name}
                role={toSummary(h.role, profileOf(h.role))}
                index={i}
                onOpen={openRole}
              />
            ))}
          </List>
        ) : (
          <List label="Permissions">
            {(visible as typeof results.permissions).map((h, i) => (
              <ListItem
                key={h.index}
                index={i}
                onClick={() => openPerm(h.permission)}
                headline={
                  <span className={styles.tokenWrap}>
                    <PermissionToken permission={h.permission} risk={index.classOf(h.index)} static />
                  </span>
                }
              />
            ))}
          </List>
        )}
        {list.length > shown && (
          <div className={styles.more}>
            <Button variant="tonal" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({list.length - shown} left)
            </Button>
          </div>
        )}
      </div>
    );
  }

  const hasResults = !multi && q !== '' && (results.roles.length > 0 || results.permissions.length > 0);

  return (
    <div ref={root} className={styles.root} onKeyDown={onRootKey}>
      <div className={styles.bar}>
        <SearchBar
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onInputKey}
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {exactRole && (
        <JumpCard eyebrow="Open role" value={exactRole.name} onClick={() => openRole(exactRole.name)} enter />
      )}
      {exactPerm && (
        <JumpCard eyebrow="Open permission" value={exactPerm} onClick={() => openPerm(exactPerm)} enter />
      )}
      {multi && (
        <JumpCard
          eyebrow={`${multi.length} permissions pasted`}
          value="Find minimal roles"
          onClick={() => openMinimal(multi)}
          enter
        />
      )}
      {hasResults && (
        <Tabs
          label="Result type"
          value={effectiveTab}
          onChange={(id) => setTab(id as 'roles' | 'permissions')}
          tabs={[
            { id: 'roles', label: `Roles · ${results.roles.length.toLocaleString('en-US')}` },
            {
              id: 'permissions',
              label: `Permissions · ${results.permissions.length.toLocaleString('en-US')}`,
            },
          ]}
        />
      )}
      {body}
    </div>
  );
}
