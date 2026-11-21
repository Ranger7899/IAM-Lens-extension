// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkForUpdate,
  clearCustomRoles,
  closeStore,
  getMeta,
  listCustomRoles,
  loadBundledSnapshot,
  loadPreviousSnapshot,
  loadSnapshot,
  saveCustomRoles,
  deleteCustomRolesByParent,
  getStoredSnapshot,
} from '../snapshot';
import { makeSnapshot, realSnapshot } from './fixtures';
import type { Snapshot } from '../schema';

const MANIFEST_URL = 'https://cdn.test/iam/manifest.json';
const SNAP_URL = 'https://cdn.test/iam/roles.snapshot.json';

function manifestOf(s: Snapshot) {
  return { schemaVersion: 1, version: s.version, sha256: s.sha256, generatedAt: s.generatedAt };
}

function mockFetch(routes: Record<string, unknown | (() => Response)>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in routes)) return new Response('not found', { status: 404 });
    const body = routes[url];
    if (typeof body === 'function') return (body as () => Response)();
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
}

let bundled: Snapshot;
const loadBundled = async () => bundled;

beforeEach(async () => {
  await closeStore();
  await new Promise<void>((res, rej) => {
    const req = indexedDB.deleteDatabase('iam-lens');
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
  bundled = await makeSnapshot([{ name: 'roles/a', perms: ['s.r.get'] }], '2026-01-01T00:00:00.000Z');
});

describe('loadSnapshot', () => {
  it('falls back to the bundled snapshot when the store is empty', async () => {
    const { snapshot, source } = await loadSnapshot({ loadBundled });
    expect(source).toBe('bundled');
    expect(snapshot.version).toBe(bundled.version);
  });

  it('validates the real bundled snapshot file', async () => {
    const s = await loadBundledSnapshot({ loadBundled: async () => realSnapshot() });
    expect(s.roles).toHaveLength(2437);
  });

  it('rejects an invalid bundled snapshot', async () => {
    await expect(loadBundledSnapshot({ loadBundled: async () => ({ nope: 1 }) })).rejects.toThrow(
      /Invalid snapshot/,
    );
  });
});

describe('checkForUpdate', () => {
  it('reports up-to-date when versions match', async () => {
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(bundled) });
    const res = await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled });
    expect(res).toEqual({ status: 'up-to-date', version: bundled.version });
    expect((await getMeta()).lastCheckedAt).toBeTruthy();
    expect(await getStoredSnapshot('current')).toBeUndefined();
  });

  it('installs a newer valid snapshot, keeping the old one as previous', async () => {
    const next = await makeSnapshot(
      [
        { name: 'roles/a', perms: ['s.r.get', 's.r.list'] },
        { name: 'roles/b', perms: ['s.r.get'] },
      ],
      '2026-02-01T00:00:00.000Z',
    );
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(next), [SNAP_URL]: next });
    const res = await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled });
    expect(res).toEqual({ status: 'updated', version: next.version, previousVersion: bundled.version });
    const loaded = await loadSnapshot({ loadBundled });
    expect(loaded.source).toBe('stored');
    expect(loaded.snapshot.version).toBe(next.version);
    expect((await loadPreviousSnapshot())?.version).toBe(bundled.version);

    // second update rotates current -> previous
    const third = await makeSnapshot([{ name: 'roles/c', perms: ['x.y.z'] }], '2026-03-01T00:00:00.000Z');
    const f2 = mockFetch({ [MANIFEST_URL]: manifestOf(third), [SNAP_URL]: third });
    expect((await checkForUpdate(MANIFEST_URL, { fetch: f2, loadBundled })).status).toBe('updated');
    expect((await loadPreviousSnapshot())?.version).toBe(next.version);
    expect((await loadSnapshot({ loadBundled })).snapshot.version).toBe(third.version);
  });

  it('rejects a tampered snapshot and keeps the current one', async () => {
    const next = await makeSnapshot(
      [{ name: 'roles/a', perms: ['s.r.get', 's.r.list'] }],
      '2026-02-01T00:00:00.000Z',
    );
    const tampered = { ...next, roles: [{ ...next.roles[0], description: 'injected' }] };
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(next), [SNAP_URL]: tampered });
    const res = await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled });
    expect(res).toMatchObject({ status: 'rejected', reason: 'hash' });
    const loaded = await loadSnapshot({ loadBundled });
    expect(loaded.source).toBe('bundled');
    expect(await loadPreviousSnapshot()).toBeUndefined();
  });

  it('rejects when the manifest hash disagrees with a self-consistent snapshot', async () => {
    const next = await makeSnapshot([{ name: 'roles/z', perms: ['s.r.get'] }], '2026-02-01T00:00:00.000Z');
    const other = await makeSnapshot([{ name: 'roles/q', perms: ['s.r.get'] }], '2026-02-01T00:00:00.000Z');
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(other), [SNAP_URL]: next });
    expect(await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled })).toMatchObject({
      status: 'rejected',
      reason: 'hash',
    });
  });

  it('rejects schema-invalid snapshots and bad manifests', async () => {
    const next = await makeSnapshot(
      [{ name: 'roles/a', perms: ['s.r.get', 's.r.x'] }],
      '2026-02-01T00:00:00.000Z',
    );
    const bad = { ...next, roles: [{ ...next.roles[0], perms: [5] }] };
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(next), [SNAP_URL]: bad });
    expect(await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled })).toMatchObject({
      status: 'rejected',
      reason: 'structure',
    });
    const f2 = mockFetch({ [MANIFEST_URL]: { version: 'nope' } });
    expect(await checkForUpdate(MANIFEST_URL, { fetch: f2, loadBundled })).toMatchObject({
      status: 'rejected',
      reason: 'manifest',
    });
  });

  it('rejects rollback to an older generatedAt', async () => {
    const older = await makeSnapshot([{ name: 'roles/old', perms: ['s.r.get'] }], '2025-01-01T00:00:00.000Z');
    const f = mockFetch({ [MANIFEST_URL]: manifestOf(older), [SNAP_URL]: older });
    expect(await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled })).toMatchObject({
      status: 'rejected',
      reason: 'stale',
    });
  });

  it('returns an error (and changes nothing) on network failure', async () => {
    const f = mockFetch({});
    const res = await checkForUpdate(MANIFEST_URL, { fetch: f, loadBundled });
    expect(res).toMatchObject({ status: 'error' });
    const throwing = (async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await checkForUpdate(MANIFEST_URL, { fetch: throwing, loadBundled })).toEqual({
      status: 'error',
      message: 'offline',
    });
    expect(await getStoredSnapshot('current')).toBeUndefined();
  });
});

describe('custom roles store', () => {
  const role = (name: string, parent: string) => ({
    name,
    perms: ['a.b.get'],
    source: { kind: 'custom' as const, parent },
  });
  it('saves, lists and deletes by parent', async () => {
    await saveCustomRoles([
      role('projects/p1/roles/x', 'projects/p1'),
      role('projects/p2/roles/y', 'projects/p2'),
    ]);
    expect((await listCustomRoles()).map((r) => r.name).sort()).toEqual([
      'projects/p1/roles/x',
      'projects/p2/roles/y',
    ]);
    await deleteCustomRolesByParent('projects/p1');
    expect((await listCustomRoles()).map((r) => r.name)).toEqual(['projects/p2/roles/y']);
    await clearCustomRoles();
    expect(await listCustomRoles()).toEqual([]);
  });
});
