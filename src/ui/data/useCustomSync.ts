import { useCallback, useEffect, useRef, useState } from 'react';
import {
  readSources,
  readSyncedAt,
  summarize,
  SYNC_INTERVAL_MS,
  syncAllCustomRoles,
  syncIfStale,
  type SourceRecord,
  type SyncDeps,
  type SyncOutcome,
  type SyncSummary,
} from './customSync';
import { CUSTOM_ROLES_SIGNAL_KEY } from './IamProvider';
import type { SourceError } from './syncErrors';

export interface CustomSyncState {
  /** null while checking. */
  signedIn: boolean | null;
  sources: SourceRecord[];
  syncedAt?: string;
  summary: SyncSummary;
  syncing: boolean;
  /** Auth/scope failure: offer "Sign in again". */
  authError: SourceError | null;
  /** Any other failure of the last run. */
  error: SourceError | null;
  syncNow(): Promise<SyncOutcome>;
  /** After a successful interactive sign-in. */
  markSignedIn(): void;
  markSignedOut(): void;
}

/**
 * Status of the custom-roles sync, plus its triggers. With `auto`, syncs on mount when the last sync is missing or
 * older than an hour, and again every hour while mounted (the side panel). Never opens an interactive window.
 */
export function useCustomSync(deps: SyncDeps, { auto = false }: { auto?: boolean } = {}): CustomSyncState {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [syncedAt, setSyncedAt] = useState<string>();
  const [syncing, setSyncing] = useState(false);
  const [authError, setAuthError] = useState<SourceError | null>(null);
  const [error, setError] = useState<SourceError | null>(null);
  const alive = useRef(true);
  const depsRef = useRef(deps);
  useEffect(() => {
    depsRef.current = deps;
  }, [deps]);

  const load = useCallback(async () => {
    try {
      const [si, meta] = await Promise.all([depsRef.current.isSignedIn(), depsRef.current.getMeta()]);
      if (!alive.current) return;
      setSignedIn(si);
      setSources(readSources(meta));
      setSyncedAt(readSyncedAt(meta));
    } catch {
      if (alive.current) setSignedIn(false);
    }
  }, []);

  const apply = useCallback(
    async (run: () => Promise<SyncOutcome>): Promise<SyncOutcome> => {
      setSyncing(true);
      let out: SyncOutcome;
      try {
        out = await run();
      } catch (e) {
        out = { status: 'error', error: { kind: 'other', message: e instanceof Error ? e.message : String(e) } };
      }
      if (!alive.current) return out;
      if (out.status === 'auth') setAuthError(out.error);
      else if (out.status === 'error') setError(out.error);
      else if (out.status === 'ok') {
        setAuthError(null);
        setError(null);
      }
      if (out.status !== 'skipped') await load();
      if (alive.current) setSyncing(false);
      return out;
    },
    [load],
  );

  const syncNow = useCallback(() => apply(() => syncAllCustomRoles(depsRef.current)), [apply]);

  useEffect(() => {
    alive.current = true;
    void load().then(() => {
      if (auto) void apply(() => syncIfStale(depsRef.current));
    });
    const timer = auto
      ? setInterval(() => void apply(() => syncIfStale(depsRef.current)), SYNC_INTERVAL_MS)
      : undefined;
    // Another page (options) finished a sync or changed the roles.
    let off = () => {};
    try {
      const onChanged = (changes: Record<string, unknown>, area: string) => {
        if (area === 'local' && CUSTOM_ROLES_SIGNAL_KEY in changes) void load();
      };
      const area = chrome.storage.onChanged;
      area.addListener(onChanged);
      off = () => area.removeListener(onChanged);
    } catch {
      /* storage unavailable */
    }
    return () => {
      alive.current = false;
      if (timer) clearInterval(timer);
      off();
    };
  }, [auto, apply, load]);

  return {
    signedIn,
    sources,
    syncedAt,
    summary: summarize(sources),
    syncing,
    authError,
    error,
    syncNow,
    markSignedIn: () => setSignedIn(true),
    markSignedOut: () => {
      setSignedIn(false);
      setSources([]);
      setSyncedAt(undefined);
      setAuthError(null);
      setError(null);
    },
  };
}
