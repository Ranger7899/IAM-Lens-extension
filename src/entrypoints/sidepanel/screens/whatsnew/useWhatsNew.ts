import { useCallback, useEffect, useState } from 'react';
import {
  diffSnapshots,
  getMeta,
  loadPreviousSnapshot,
  loadSnapshot,
  type Snapshot,
  type SnapshotDiff,
} from '@/core';

/** What the screen needs from storage. Injected in tests. */
export interface WhatsNewInput {
  previous?: Snapshot;
  current: Snapshot;
  lastUpdatedAt?: string;
}
export type WhatsNewLoader = () => Promise<WhatsNewInput>;

export interface SnapshotInfo {
  version: string;
  generatedAt: string;
}

export type WhatsNewState =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'empty'; current: SnapshotInfo }
  | {
      status: 'ready';
      diff: SnapshotDiff;
      previous: SnapshotInfo;
      current: SnapshotInfo;
      lastUpdatedAt?: string;
    };

export const defaultLoader: WhatsNewLoader = async () => {
  const [previous, { snapshot: current }, meta] = await Promise.all([
    loadPreviousSnapshot().catch(() => undefined),
    loadSnapshot(),
    getMeta().catch(() => ({})),
  ]);
  return { previous, current, lastUpdatedAt: (meta as { lastUpdatedAt?: string }).lastUpdatedAt };
};

/** Runs `cb` once the browser is idle (after first paint), so a ~30 ms diff never delays the UI. */
function whenIdle(cb: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(cb, { timeout: 1000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 16);
  return () => clearTimeout(id);
}

const info = (s: Snapshot): SnapshotInfo => ({ version: s.version, generatedAt: s.generatedAt });

/** Loads previous + current, then diffs them in an idle callback. */
export function useWhatsNew(load: WhatsNewLoader = defaultLoader): WhatsNewState & { retry: () => void } {
  const [state, setState] = useState<WhatsNewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let cancelIdle: (() => void) | undefined;
    load().then(
      ({ previous, current, lastUpdatedAt }) => {
        if (cancelled) return;
        if (!previous) return setState({ status: 'empty', current: info(current) });
        cancelIdle = whenIdle(() => {
          if (cancelled) return;
          setState({
            status: 'ready',
            diff: diffSnapshots(previous, current),
            previous: info(previous),
            current: info(current),
            lastUpdatedAt,
          });
        });
      },
      (e: unknown) => {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      },
    );
    return () => {
      cancelled = true;
      cancelIdle?.();
    };
    // `load` is read once per attempt, like the IamProvider loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);
  return { ...state, retry };
}
