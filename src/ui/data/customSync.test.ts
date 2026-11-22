import { describe, expect, it, vi } from 'vitest';
import type { CustomRoleInput, MetaRecord } from '@/core';
import { AuthRequiredError, GcpApiError } from '@/core/gcp';
import {
  isStale,
  SYNC_CONCURRENCY,
  SYNC_INTERVAL_MS,
  syncAllCustomRoles,
  syncIfStale,
  type SyncDeps,
} from './customSync';

const role = (parent: string): CustomRoleInput => ({
  name: `${parent}/roles/r`,
  perms: ['a.b.get'],
  source: { kind: 'custom', parent },
});

function fakeDeps(over: Partial<SyncDeps> = {}, projects = ['a', 'b']) {
  let meta: MetaRecord = {};
  let stored: CustomRoleInput[] = [];
  const signalChanged = vi.fn();
  const deps: SyncDeps = {
    isSignedIn: async () => true,
    listProjects: async () => projects.map((id) => ({ id, displayName: id.toUpperCase(), name: `projects/${id}` })),
    listOrganizations: async () => [],
    fetchRoles: async (p) => [role(p)],
    storedRoles: async () => stored,
    saveRoles: async (r) => void (stored = [...stored, ...r]),
    deleteRolesByParent: async (p) => void (stored = stored.filter((r) => r.source.parent !== p)),
    getMeta: async () => meta,
    patchMeta: async (p) => (meta = { ...meta, ...p }),
    signalChanged,
    ...over,
  };
  return { deps, signalChanged, meta: () => meta, stored: () => stored, seed: (s: CustomRoleInput[]) => (stored = s) };
}

describe('syncAllCustomRoles', () => {
  it('discovers projects and orgs, stores roles, writes meta and signals once', async () => {
    const f = fakeDeps({
      listOrganizations: async () => [{ id: '9', displayName: 'Acme', name: 'organizations/9' }],
    });
    const out = await syncAllCustomRoles(f.deps);
    expect(out.status).toBe('ok');
    expect(f.stored().map((r) => r.source.parent).sort()).toEqual(['organizations/9', 'projects/a', 'projects/b']);
    const m = f.meta() as { customSources: { parent: string; roleCount: number }[]; customSyncedAt: string };
    expect(m.customSources).toHaveLength(3);
    expect(m.customSources.every((s) => s.roleCount === 1)).toBe(true);
    expect(typeof m.customSyncedAt).toBe('string');
    expect(f.signalChanged).toHaveBeenCalledTimes(1);
  });

  it('never runs more than 4 fetches at once', async () => {
    let live = 0;
    let max = 0;
    const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const f = fakeDeps(
      {
        fetchRoles: async (p) => {
          live++;
          max = Math.max(max, live);
          await new Promise((r) => setTimeout(r, 5));
          live--;
          return [role(p)];
        },
      },
      ids,
    );
    await syncAllCustomRoles(f.deps);
    expect(max).toBe(SYNC_CONCURRENCY);
    expect(f.stored()).toHaveLength(20);
  });

  it('counts a 403 source as no access, deletes its roles and does not fail the run', async () => {
    const f = fakeDeps({
      fetchRoles: async (p) => {
        if (p === 'projects/b') throw new GcpApiError(403, 'IAM_PERMISSION_DENIED', 'denied');
        return [role(p)];
      },
    });
    f.seed([role('projects/b')]);
    const out = await syncAllCustomRoles(f.deps);
    expect(out.status).toBe('ok');
    const sources = (f.meta() as { customSources: { parent: string; noAccess?: boolean; error?: unknown }[] }).customSources;
    expect(sources.find((s) => s.parent === 'projects/b')).toMatchObject({ noAccess: true });
    expect(sources.find((s) => s.parent === 'projects/b')?.error).toBeUndefined();
    expect(f.stored().map((r) => r.source.parent)).toEqual(['projects/a']);
  });

  it('removes stored roles of sources that are no longer accessible', async () => {
    const f = fakeDeps();
    f.seed([role('projects/gone')]);
    await f.deps.patchMeta({
      customSources: [{ parent: 'projects/gone', kind: 'project', displayName: 'Gone', roleCount: 1 }],
    });
    await syncAllCustomRoles(f.deps);
    expect(f.stored().some((r) => r.source.parent === 'projects/gone')).toBe(false);
    expect((f.meta().customSources as { parent: string }[]).map((s) => s.parent)).toEqual([
      'projects/a',
      'projects/b',
    ]);
  });

  it('aborts with an auth outcome on an auth error and leaves meta untouched', async () => {
    const f = fakeDeps({ fetchRoles: async () => Promise.reject(new AuthRequiredError()) });
    const out = await syncAllCustomRoles(f.deps);
    expect(out.status).toBe('auth');
    expect(f.meta().customSyncedAt).toBeUndefined();
    expect(f.meta().customSyncLockAt).toBe(0);
  });

  it('is single-flight: concurrent callers share one run', async () => {
    const list = vi.fn(async () => [{ id: 'a', displayName: 'A', name: 'projects/1' }]);
    const f = fakeDeps({ listProjects: list });
    const [x, y] = await Promise.all([syncAllCustomRoles(f.deps), syncAllCustomRoles(f.deps)]);
    expect(x).toBe(y);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('skips when another context holds a fresh lock, or when signed out', async () => {
    const f = fakeDeps();
    await f.deps.patchMeta({ customSyncLockAt: Date.now() });
    expect(await syncAllCustomRoles(f.deps)).toEqual({ status: 'skipped', reason: 'locked' });
    const g = fakeDeps({ isSignedIn: async () => false });
    expect(await syncAllCustomRoles(g.deps)).toEqual({ status: 'skipped', reason: 'signed-out' });
  });
});

describe('syncIfStale', () => {
  it('syncs when never synced, skips when fresh, syncs again after an hour', async () => {
    let t = 1_000_000;
    const f = fakeDeps({ now: () => t });
    expect((await syncIfStale(f.deps)).status).toBe('ok');
    t += 60_000;
    expect(await syncIfStale(f.deps)).toEqual({ status: 'skipped', reason: 'fresh' });
    t += SYNC_INTERVAL_MS;
    expect((await syncIfStale(f.deps)).status).toBe('ok');
  });

  it('isStale handles missing and bad timestamps', () => {
    expect(isStale(undefined)).toBe(true);
    expect(isStale('nope')).toBe(true);
    expect(isStale(new Date().toISOString())).toBe(false);
  });
});
