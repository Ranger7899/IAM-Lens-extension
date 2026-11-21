/**
 * One loaded `IamIndex` for every entrypoint. The provider calls `loadSnapshot()` once (IndexedDB
 * `current`, else the bundled asset), builds the index, and warms the search indexes when idle.
 * It never blocks rendering by itself: wrap routed content in `<IamGate>` to show the loading
 * skeleton and the error card.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IamIndex, loadSnapshot, type Snapshot, type SnapshotSource } from '@/core';
import { ErrorCard, SkeletonList } from '@/ui/components';

export interface SnapshotMeta {
  version: string;
  generatedAt: string;
  source: SnapshotSource;
}

export type IamState =
  | { status: 'loading'; index?: undefined; snapshotMeta?: undefined; error?: undefined }
  | { status: 'ready'; index: IamIndex; snapshotMeta: SnapshotMeta; error?: undefined }
  | { status: 'error'; index?: undefined; snapshotMeta?: undefined; error: Error };

export type IamValue = IamState & { retry: () => void };

export type SnapshotLoader = () => Promise<{ snapshot: Snapshot; source: SnapshotSource }>;

const Ctx = createContext<IamValue | null>(null);

const idle = (cb: () => void): (() => void) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(cb, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, 50);
  return () => clearTimeout(id);
};

export interface IamProviderProps {
  children: ReactNode;
  /** Injected in tests; defaults to the core `loadSnapshot`. */
  loader?: SnapshotLoader;
}

export function IamProvider({ children, loader = () => loadSnapshot() }: IamProviderProps) {
  const [state, setState] = useState<IamState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // The loader is read once per attempt; changing the prop later does not reload.
  const loaderRef = useRef(loader);
  // Keeps the in-flight load per attempt so React StrictMode's double effect doesn't load twice.
  const inflight = useRef<{ attempt: number; promise: Promise<IamState> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cancelIdle: (() => void) | undefined;
    if (inflight.current?.attempt !== attempt) {
      const promise = loaderRef
        .current()
        .then(({ snapshot, source }): IamState => {
          const index = new IamIndex(snapshot);
          return {
            status: 'ready',
            index,
            snapshotMeta: { version: snapshot.version, generatedAt: snapshot.generatedAt, source },
          };
        })
        .catch(
          (e: unknown): IamState => ({
            status: 'error',
            error: e instanceof Error ? e : new Error(String(e)),
          }),
        );
      inflight.current = { attempt, promise };
    }
    void inflight.current.promise.then((next) => {
      if (cancelled) return;
      setState(next);
      if (next.status === 'ready') cancelIdle = idle(() => void next.index.warmSearchIdle());
    });
    return () => {
      cancelled = true;
      cancelIdle?.();
    };
  }, [attempt]);

  // Perf/e2e hook: true once the index is built and the routed UI can render.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const el = document.documentElement;
    el.dataset.ready = 'true';
    return () => {
      delete el.dataset.ready;
    };
  }, [state.status]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo<IamValue>(() => ({ ...state, retry }), [state, retry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIam(): IamValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useIam outside IamProvider');
  return v;
}

/** Renders the skeleton while loading, the error card (with retry) on failure, else the children. */
export function IamGate({ children }: { children: ReactNode }) {
  const iam = useIam();
  if (iam.status === 'loading') return <SkeletonList />;
  if (iam.status === 'error')
    return (
      <ErrorCard
        title="Couldn't load the role data"
        detail={iam.error.message}
        onRetry={iam.retry}
      />
    );
  return <>{children}</>;
}
