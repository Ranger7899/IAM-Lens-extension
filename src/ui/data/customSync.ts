/**
 * Custom-roles auto-sync: discovers every project and organization the signed-in user can see, fetches the
 * custom roles of each (limited concurrency), replaces what is stored per source and records the outcome in
 * `meta.customSources` / `meta.customSyncedAt`. Shared by the options page and the side panel.
 */
import type { CustomRoleInput, MetaRecord } from '@/core';
import type { GcpResource } from '@/core/gcp';
import { signalCustomRolesChanged } from './IamProvider';
import { describeError, type SourceError } from './syncErrors';

export interface SourceRecord {
  /** `projects/<id>` or `organizations/<id>`. */
  parent: string;
  kind: 'project' | 'organization';
  displayName: string;
  fetchedAt?: string;
  /** Number of custom roles stored for this source after the last sync. */
  roleCount?: number;
  /** The account can't list roles here (403/404). Counted, never shown as an error. */
  noAccess?: boolean;
  /** Any other per-source failure (rate limit, offline). Previous roles are kept. */
  error?: SourceError;
}

export const SYNC_INTERVAL_MS = 60 * 60 * 1000;
export const SYNC_CONCURRENCY = 4;
/** A `meta.customSyncLockAt` younger than this blocks other contexts (panel vs options) from starting a run. */
export const SYNC_LOCK_MS = 2 * 60 * 1000;

export function parentOf(kind: SourceRecord['kind'], r: GcpResource): string {
  return `${kind === 'project' ? 'projects' : 'organizations'}/${r.id}`;
}

/** Everything the sync needs from the outside world. `OptionsDeps` satisfies it structurally. */
export interface SyncDeps {
  /** True while a sign-in record exists (an expired token is renewed silently by the fetchers). */
  isSignedIn(): Promise<boolean>;
  listProjects(): Promise<GcpResource[]>;
  listOrganizations(): Promise<GcpResource[]>;
  fetchRoles(parent: string): Promise<CustomRoleInput[]>;
  storedRoles(): Promise<CustomRoleInput[]>;
  saveRoles(roles: readonly CustomRoleInput[]): Promise<void>;
  deleteRolesByParent(parent: string): Promise<void>;
  getMeta(): Promise<MetaRecord>;
  patchMeta(patch: MetaRecord): Promise<MetaRecord>;
  /** Injectable for tests. */
  now?(): number;
  /** Injectable for tests; defaults to `signalCustomRolesChanged`. */
  signalChanged?(): void;
}

export type SyncOutcome =
  | { status: 'ok'; sources: SourceRecord[]; syncedAt: string }
  /** Auth or scope failure: show "Sign in again". Nothing was changed. */
  | { status: 'auth'; error: SourceError }
  | { status: 'error'; error: SourceError }
  /** Another context holds the lock, or the user is not signed in. */
  | { status: 'skipped'; reason: 'locked' | 'signed-out' | 'fresh' };

export function readSources(meta: MetaRecord): SourceRecord[] {
  return Array.isArray(meta.customSources) ? (meta.customSources as SourceRecord[]) : [];
}

export function readSyncedAt(meta: MetaRecord): string | undefined {
  return typeof meta.customSyncedAt === 'string' ? meta.customSyncedAt : undefined;
}

export function isStale(syncedAt: string | undefined, now = Date.now()): boolean {
  if (!syncedAt) return true;
  const t = Date.parse(syncedAt);
  return Number.isNaN(t) || now - t >= SYNC_INTERVAL_MS;
}

export interface SyncSummary {
  roles: number;
  /** Sources that contribute at least one role. */
  projects: number;
  organizations: number;
  noAccess: number;
}

export function summarize(sources: readonly SourceRecord[]): SyncSummary {
  const s: SyncSummary = { roles: 0, projects: 0, organizations: 0, noAccess: 0 };
  for (const r of sources) {
    if (r.noAccess) s.noAccess++;
    const n = r.roleCount ?? 0;
    if (n <= 0) continue;
    s.roles += n;
    if (r.kind === 'project') s.projects++;
    else s.organizations++;
  }
  return s;
}

async function mapLimit<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      try {
        await fn(items[next++]!);
      } catch (e) {
        failed = true;
        throw e;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

class AbortSync extends Error {
  constructor(readonly error: SourceError) {
    super(error.message);
  }
}

const isNoAccess = (e: SourceError) => e.kind === 'forbidden' || e.kind === 'not-found';

async function run(deps: SyncDeps): Promise<SyncOutcome> {
  const now = deps.now ?? Date.now;
  const signal = deps.signalChanged ?? signalCustomRolesChanged;

  if (!(await deps.isSignedIn())) return { status: 'skipped', reason: 'signed-out' };
  const meta = await deps.getMeta();
  const lock = typeof meta.customSyncLockAt === 'number' ? meta.customSyncLockAt : 0;
  if (now() - lock < SYNC_LOCK_MS && lock <= now()) return { status: 'skipped', reason: 'locked' };
  await deps.patchMeta({ customSyncLockAt: now() });

  try {
    // 1. Discover. Auth/scope errors abort; "no organizations" (403/404) is just an empty list.
    const guard = async <T>(p: Promise<T>, onNoAccess?: T): Promise<T> => {
      try {
        return await p;
      } catch (e) {
        const err = describeError(e);
        if (err.kind === 'auth' || err.kind === 'scope') throw new AbortSync(err);
        if (onNoAccess !== undefined && isNoAccess(err)) return onNoAccess;
        throw new AbortSync(err);
      }
    };
    const [projects, orgs] = await Promise.all([
      guard(deps.listProjects()),
      guard(deps.listOrganizations(), [] as GcpResource[]),
    ]);
    const found: SourceRecord[] = [
      ...orgs.map((r): SourceRecord => ({ parent: parentOf('organization', r), kind: 'organization', displayName: r.displayName })),
      ...projects.map((r): SourceRecord => ({ parent: parentOf('project', r), kind: 'project', displayName: r.displayName })),
    ];
    const previous = new Map(readSources(meta).map((s) => [s.parent, s]));
    const results = new Map<string, SourceRecord>();

    // 2. Fetch each source with a concurrency cap; replace its stored roles as it arrives.
    await mapLimit(found, SYNC_CONCURRENCY, async (rec) => {
      try {
        const roles = await deps.fetchRoles(rec.parent);
        await deps.deleteRolesByParent(rec.parent);
        await deps.saveRoles(roles);
        results.set(rec.parent, { ...rec, fetchedAt: new Date(now()).toISOString(), roleCount: roles.length });
      } catch (e) {
        if (e instanceof AbortSync) throw e;
        const err = describeError(e, rec.parent);
        if (err.kind === 'auth' || err.kind === 'scope') throw new AbortSync(err);
        if (isNoAccess(err)) {
          await deps.deleteRolesByParent(rec.parent);
          results.set(rec.parent, { ...rec, fetchedAt: new Date(now()).toISOString(), roleCount: 0, noAccess: true });
        } else {
          // Keep what we had for this source and surface the reason.
          const old = previous.get(rec.parent);
          results.set(rec.parent, { ...rec, fetchedAt: old?.fetchedAt, roleCount: old?.roleCount, error: err });
        }
      }
    });

    // 3. Drop stored roles of sources that are no longer accessible.
    const discovered = new Set(found.map((s) => s.parent));
    const stale = new Set<string>([...previous.keys()]);
    for (const r of await deps.storedRoles()) stale.add(r.source.parent);
    for (const parent of stale) if (!discovered.has(parent)) await deps.deleteRolesByParent(parent);

    const sources = found.map((f) => results.get(f.parent) ?? f);
    const syncedAt = new Date(now()).toISOString();
    await deps.patchMeta({ customSources: sources, customSyncedAt: syncedAt });
    signal();
    return { status: 'ok', sources, syncedAt };
  } catch (e) {
    // Some sources may already have been replaced before an abort.
    signal();
    if (e instanceof AbortSync) {
      return { status: e.error.kind === 'auth' || e.error.kind === 'scope' ? 'auth' : 'error', error: e.error };
    }
    return { status: 'error', error: describeError(e) };
  } finally {
    await deps.patchMeta({ customSyncLockAt: 0 }).catch(() => {});
  }
}

let inflight: Promise<SyncOutcome> | null = null;

/** Syncs every accessible project and organization. Single-flight: concurrent callers share one run. */
export function syncAllCustomRoles(deps: SyncDeps): Promise<SyncOutcome> {
  inflight ??= run(deps).finally(() => {
    inflight = null;
  });
  return inflight;
}

/** The staleness-gated entry point for the side panel's mount and hourly triggers. */
export async function syncIfStale(deps: SyncDeps): Promise<SyncOutcome> {
  if (inflight) return inflight;
  if (!(await deps.isSignedIn())) return { status: 'skipped', reason: 'signed-out' };
  const meta = await deps.getMeta();
  if (!isStale(readSyncedAt(meta), (deps.now ?? Date.now)())) return { status: 'skipped', reason: 'fresh' };
  return syncAllCustomRoles(deps);
}
