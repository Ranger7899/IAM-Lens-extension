/** Custom-role sources (projects / organizations): stored in `meta.customSources`, roles in the custom-roles store. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GcpResource } from '@/core/gcp';
import type { OptionsDeps } from './deps';
import { describeError, type SourceError } from './format';

export interface SourceRecord {
  /** `projects/<id>` or `organizations/<id>`. */
  parent: string;
  kind: 'project' | 'organization';
  displayName: string;
  fetchedAt?: string;
  error?: SourceError;
}

export function parentOf(kind: SourceRecord['kind'], r: GcpResource): string {
  return `${kind === 'project' ? 'projects' : 'organizations'}/${r.id}`;
}

export function useCustomSources(deps: OptionsDeps) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());
  const ref = useRef<SourceRecord[]>([]);

  const commit = useCallback(
    async (next: SourceRecord[]) => {
      ref.current = next;
      setSources(next);
      await deps.patchMeta({ customSources: next });
    },
    [deps],
  );

  useEffect(() => {
    let live = true;
    void Promise.all([deps.isSignedIn(), deps.getMeta(), deps.storedRoles()]).then(([si, meta, roles]) => {
      if (!live) return;
      const list = Array.isArray(meta.customSources) ? (meta.customSources as SourceRecord[]) : [];
      const c: Record<string, number> = {};
      for (const r of roles) c[r.source.parent] = (c[r.source.parent] ?? 0) + 1;
      ref.current = list;
      setSignedIn(si);
      setSources(list);
      setCounts(c);
    });
    return () => {
      live = false;
    };
  }, [deps]);

  const setBusyFor = (parent: string, on: boolean) =>
    setBusy((b) => {
      const n = new Set(b);
      if (on) n.add(parent);
      else n.delete(parent);
      return n;
    });

  /** Fetches the source's roles, replaces what's stored for it and records the outcome inline. */
  const fetchSource = useCallback(
    async (rec: SourceRecord) => {
      setBusyFor(rec.parent, true);
      let next: SourceRecord;
      try {
        const roles = await deps.fetchRoles(rec.parent);
        await deps.deleteRolesByParent(rec.parent);
        await deps.saveRoles(roles);
        setCounts((c) => ({ ...c, [rec.parent]: roles.length }));
        next = { ...rec, fetchedAt: new Date().toISOString(), error: undefined };
      } catch (e) {
        next = { ...rec, error: describeError(e, rec.parent) };
      }
      const cur = ref.current;
      await commit(
        cur.some((s) => s.parent === rec.parent)
          ? cur.map((s) => (s.parent === rec.parent ? next : s))
          : [...cur, next],
      );
      setBusyFor(rec.parent, false);
    },
    [deps, commit],
  );

  const add = useCallback(
    async (kind: SourceRecord['kind'], r: GcpResource) => {
      const rec: SourceRecord = { parent: parentOf(kind, r), kind, displayName: r.displayName };
      if (ref.current.some((s) => s.parent === rec.parent)) return;
      await commit([...ref.current, rec]);
      await fetchSource(rec);
    },
    [commit, fetchSource],
  );

  const refresh = useCallback(
    async (parent: string) => {
      const rec = ref.current.find((s) => s.parent === parent);
      if (rec) await fetchSource(rec);
    },
    [fetchSource],
  );

  const refreshAll = useCallback(async () => {
    for (const rec of [...ref.current]) await fetchSource(rec);
  }, [fetchSource]);

  const remove = useCallback(
    async (parent: string) => {
      await deps.deleteRolesByParent(parent);
      setCounts((c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== parent)));
      await commit(ref.current.filter((s) => s.parent !== parent));
    },
    [deps, commit],
  );

  const signOutAndClear = useCallback(async () => {
    await deps.signOut();
    await commit([]);
    setCounts({});
    setSignedIn(false);
  }, [deps, commit]);

  return { signedIn, setSignedIn, sources, counts, busy, add, refresh, refreshAll, remove, signOutAndClear };
}
