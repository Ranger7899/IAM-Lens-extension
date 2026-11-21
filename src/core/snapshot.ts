/** Snapshot store (IndexedDB) and remote updater. */
import { openDB, type IDBPDatabase } from 'idb';
import type { CustomRoleInput } from './model';
import {
  SnapshotValidationError,
  canonicalContent,
  parseManifest,
  parseSnapshot,
  sha256Hex,
  type Snapshot,
} from './schema';

/**
 * TODO: the public repo / GitHub Pages URL is not chosen yet. Point this at the directory that
 * serves `manifest.json` and `roles.snapshot.json`. Until then updates fail closed (network error).
 */
export const SNAPSHOT_BASE_URL = 'https://example.invalid/iam-lens/data';
export const DEFAULT_MANIFEST_URL = `${SNAPSHOT_BASE_URL}/manifest.json`;
/** Hard cap on a downloaded snapshot (bytes of text). The real one is ~2 MB. */
export const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;

export const DB_NAME = 'iam-lens';
const DB_VERSION = 1;
export type SnapshotKind = 'current' | 'previous';
export type SnapshotSource = 'stored' | 'bundled';

export interface MetaRecord {
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

let dbPromise: Promise<IDBPDatabase> | undefined;

/** Opens (creating if needed) the `iam-lens` database. */
export function openStore(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots');
      if (!db.objectStoreNames.contains('custom-roles'))
        db.createObjectStore('custom-roles', { keyPath: 'name' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    },
  });
  return dbPromise;
}

/** Closes the cached connection (tests and `deleteDatabase`). */
export async function closeStore(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = undefined;
}

export interface LoaderOptions {
  /** Loads the raw bundled snapshot JSON. Defaults to fetching the packaged asset. */
  loadBundled?: () => Promise<unknown>;
}

async function defaultLoadBundled(): Promise<unknown> {
  const mod = await import('./bundled');
  return mod.loadBundledSnapshotJson();
}

/** The bundled snapshot, validated. */
export async function loadBundledSnapshot(opts: LoaderOptions = {}): Promise<Snapshot> {
  return parseSnapshot(await (opts.loadBundled ?? defaultLoadBundled)());
}

/** A stored snapshot (already validated when it was written), or undefined. */
export async function getStoredSnapshot(kind: SnapshotKind): Promise<Snapshot | undefined> {
  const db = await openStore();
  return (await db.get('snapshots', kind)) as Snapshot | undefined;
}

/** IndexedDB `current` if present, else the bundled snapshot. */
export async function loadSnapshot(
  opts: LoaderOptions = {},
): Promise<{ snapshot: Snapshot; source: SnapshotSource }> {
  try {
    const stored = await getStoredSnapshot('current');
    if (stored) return { snapshot: stored, source: 'stored' };
  } catch {
    // IndexedDB unavailable or corrupt: fall back to the bundled copy.
  }
  return { snapshot: await loadBundledSnapshot(opts), source: 'bundled' };
}

/** The snapshot before the last update (for "What's new"), or undefined if never updated. */
export async function loadPreviousSnapshot(): Promise<Snapshot | undefined> {
  return getStoredSnapshot('previous');
}

export async function getMeta(): Promise<MetaRecord> {
  const db = await openStore();
  return ((await db.get('meta', 'state')) as MetaRecord | undefined) ?? {};
}

export async function patchMeta(patch: MetaRecord): Promise<MetaRecord> {
  const db = await openStore();
  const next = { ...((await db.get('meta', 'state')) as MetaRecord | undefined), ...patch };
  await db.put('meta', next, 'state');
  return next;
}

// ---- custom roles ----

export async function listCustomRoles(): Promise<CustomRoleInput[]> {
  const db = await openStore();
  return (await db.getAll('custom-roles')) as CustomRoleInput[];
}

export async function saveCustomRoles(roles: readonly CustomRoleInput[]): Promise<void> {
  const db = await openStore();
  const tx = db.transaction('custom-roles', 'readwrite');
  await Promise.all([...roles.map((r) => tx.store.put(r)), tx.done]);
}

export async function deleteCustomRolesByParent(parent: string): Promise<void> {
  const db = await openStore();
  const tx = db.transaction('custom-roles', 'readwrite');
  for await (const cursor of tx.store) {
    if ((cursor.value as CustomRoleInput).source.parent === parent) await cursor.delete();
  }
  await tx.done;
}

export async function clearCustomRoles(): Promise<void> {
  const db = await openStore();
  await db.clear('custom-roles');
}

// ---- updater ----

export type UpdateResult =
  | { status: 'up-to-date'; version: string }
  | { status: 'updated'; version: string; previousVersion: string }
  | { status: 'rejected'; reason: SnapshotValidationError['reason']; message: string }
  | { status: 'error'; message: string };

export interface UpdateOptions extends LoaderOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  now?: () => Date;
}

async function fetchText(f: typeof fetch, url: string, signal?: AbortSignal): Promise<string> {
  const res = await f(url, { signal, cache: 'no-cache', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const len = Number(res.headers.get('content-length'));
  if (len > MAX_SNAPSHOT_BYTES) throw new SnapshotValidationError(`Response too large: ${len} bytes`, 'size');
  const text = await res.text();
  if (text.length > MAX_SNAPSHOT_BYTES) throw new SnapshotValidationError('Response too large', 'size');
  return text;
}

/**
 * Fetches the manifest and, when its version differs from the installed one, downloads the
 * snapshot, verifies it (zod, structure, SHA-256 of the canonical content equal to both the
 * snapshot's and the manifest's hash, no rollback to an older `generatedAt`) and only then
 * rotates `current` -> `previous` and stores the new `current`.
 * Anything invalid is rejected and the installed snapshot is left untouched.
 */
export async function checkForUpdate(
  manifestUrl: string = DEFAULT_MANIFEST_URL,
  opts: UpdateOptions = {},
): Promise<UpdateResult> {
  const f = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const now = (opts.now ?? (() => new Date()))().toISOString();
  try {
    const manifest = parseManifest(JSON.parse(await fetchText(f, manifestUrl, opts.signal)));
    const { snapshot: installed, source } = await loadSnapshot(opts);
    await patchMeta({ lastCheckedAt: now });
    if (manifest.version === installed.version) return { status: 'up-to-date', version: installed.version };

    const snapUrl = new URL(manifest.url ?? 'roles.snapshot.json', manifestUrl).toString();
    const raw = JSON.parse(await fetchText(f, snapUrl, opts.signal)) as unknown;
    const next = parseSnapshot(raw);
    const actual = await sha256Hex(canonicalContent(next.permissions, next.roles));
    if (actual !== next.sha256 || actual !== manifest.sha256) {
      throw new SnapshotValidationError(
        `sha256 mismatch: computed ${actual}, snapshot ${next.sha256}, manifest ${manifest.sha256}`,
        'hash',
      );
    }
    if (next.version !== actual.slice(0, 12) || next.version !== manifest.version) {
      throw new SnapshotValidationError('version does not match content hash/manifest', 'version');
    }
    if (Date.parse(next.generatedAt) < Date.parse(installed.generatedAt)) {
      throw new SnapshotValidationError('Remote snapshot is older than the installed one', 'stale');
    }

    const db = await openStore();
    const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
    // The first remote update keeps the bundled snapshot as `previous` so "What's new" has something to diff.
    await tx.objectStore('snapshots').put(installed, 'previous');
    await tx.objectStore('snapshots').put(next, 'current');
    const meta = ((await tx.objectStore('meta').get('state')) as MetaRecord | undefined) ?? {};
    await tx
      .objectStore('meta')
      .put({ ...meta, lastCheckedAt: now, lastUpdatedAt: now, previousSource: source }, 'state');
    await tx.done;
    return { status: 'updated', version: next.version, previousVersion: installed.version };
  } catch (e) {
    if (e instanceof SnapshotValidationError)
      return { status: 'rejected', reason: e.reason, message: e.message };
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
