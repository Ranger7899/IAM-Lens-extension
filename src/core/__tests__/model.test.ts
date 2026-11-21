// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { IamIndex, tokenize } from '../model';
import { makeSnapshot, realSnapshot } from './fixtures';

describe('IamIndex (real snapshot)', () => {
  const index = new IamIndex(realSnapshot());

  it('looks up roles and inverted index', () => {
    const role = index.role('roles/storage.objectViewer')!;
    expect(role).toBeDefined();
    expect(index.findRole('storage.objectViewer')).toBe(role);
    const get = index.permissionIndex('storage.objects.get')!;
    expect(index.roleGrants(role, get)).toBe(true);
    const names = [...index.roleIdxsGranting('storage.objects.get')].map((i) => index.roles[i].name);
    expect(names).toContain('roles/storage.objectViewer');
    expect(names).toContain('roles/storage.admin');
    expect(index.roleIdxsGranting('no.such.perm')).toHaveLength(0);
  });

  it('inverted index is consistent with role perms', () => {
    let edges = 0;
    for (const r of index.roles) edges += r.perms.length;
    expect(index.edgeCount).toBe(edges);
  });

  it('sorts roles by size', () => {
    const sizes = Array.from(index.rolesBySize, (i) => index.roles[i].perms.length);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1]);
  });

  it('groups permissions by service', () => {
    const groups = index.permissionsByService(index.role('roles/storage.objectViewer')!);
    expect(groups.map((g) => g.service)).toEqual(['resourcemanager', 'storage']);
    const total = groups.reduce((n, g) => n + g.indices.length, 0);
    expect(total).toBe(index.role('roles/storage.objectViewer')!.perms.length);
    expect(groups[1].permissions).toContain('storage.objects.get');
  });

  it('computes privilege profiles', () => {
    const p = index.profile(index.role('roles/owner')!);
    expect(p.admin).toBeGreaterThan(0);
    expect(p.read + p.write + p.admin).toBe(index.role('roles/owner')!.perms.length);
  });

  it('matches wildcard permissions', () => {
    const idx = index.matchPermissions('storage.objects.*');
    expect(idx.length).toBeGreaterThanOrEqual(6);
    expect(index.permissions[idx[0]].startsWith('storage.objects.')).toBe(true);
  });

  it('search: partial permission tokens match', () => {
    const { permissions } = index.search('objects.get');
    expect(permissions.map((p) => p.permission)).toContain('storage.objects.get');
    expect(permissions[0].permission.endsWith('.objects.get')).toBe(true);
  });

  it('search: exact role id and short id rank first', () => {
    expect(index.search('roles/storage.objectViewer').roles[0].role.name).toBe('roles/storage.objectViewer');
    expect(index.search('storage.objectViewer').roles[0].role.name).toBe('roles/storage.objectViewer');
  });

  it('search: query token equal to the role service ranks that service first', () => {
    expect(index.search('storage').roles[0].role.name).toMatch(/^roles\/storage\./);
    const top = index
      .search('storage')
      .roles.slice(0, 3)
      .map((h) => h.role.name);
    expect(top.every((n) => n.startsWith('roles/storage.'))).toBe(true);
  });

  it('search: text finds roles by title words', () => {
    const { roles } = index.search('bigquery admin');
    expect(roles.length).toBeGreaterThan(0);
    expect(roles.slice(0, 5).map((r) => r.role.name)).toContain('roles/bigquery.admin');
  });

  it('search: exact permission ranks first and empty query is empty', () => {
    expect(index.search('storage.objects.get').permissions[0].permission).toBe('storage.objects.get');
    expect(index.search('   ')).toEqual({ roles: [], permissions: [] });
  });

  it('search respects limit', () => {
    const r = index.search('get', { limit: 5 });
    expect(r.roles.length).toBeLessThanOrEqual(5);
    expect(r.permissions.length).toBeLessThanOrEqual(5);
  });

  it('tokenize splits dots, slashes and camelCase', () => {
    expect(tokenize('roles/storage.objectViewer')).toEqual([
      'roles',
      'storage',
      'objectviewer',
      'object',
      'viewer',
    ]);
  });
});

describe('IamIndex custom roles', () => {
  it('adds custom roles and unknown permissions', async () => {
    const snap = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.things.get', 'a.things.list'] }]);
    const index = new IamIndex(snap, [
      {
        name: 'projects/p1/roles/mine',
        title: 'My role',
        perms: ['a.things.get', 'zzz.new.permission'],
        source: { kind: 'custom', parent: 'projects/p1' },
      },
    ]);
    const custom = index.role('projects/p1/roles/mine')!;
    expect(custom.source).toEqual({ kind: 'custom', parent: 'projects/p1' });
    expect(custom.perms).toHaveLength(2);
    expect(index.hasPermission('zzz.new.permission')).toBe(true);
    expect([...index.roleIdxsGranting('a.things.get')].map((i) => index.roles[i].name).sort()).toEqual([
      'projects/p1/roles/mine',
      'roles/a.viewer',
    ]);
    expect(index.search('My role').roles[0].role.name).toBe('projects/p1/roles/mine');
  });
});

describe('performance budgets (real snapshot)', () => {
  // Budgets: build < 150 ms and search < 16 ms; asserted with 2x slack for slow CI machines.
  it('builds in < 150 ms (2x slack) and searches in < 16 ms (2x slack)', () => {
    const snap = realSnapshot();
    // Warm-up pass so JIT noise is not measured as cold-start of the test runner itself.
    new IamIndex(snap).warmSearch();

    const builds: number[] = [];
    let index!: IamIndex;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      index = new IamIndex(snap);
      index.warmSearch(); // include search-index construction in the budget
      builds.push(performance.now() - t0);
    }
    const build = Math.min(...builds);

    const queries = [
      'storage.objects.get',
      'bigquery admin',
      'objects.get',
      'roles/storage.objectViewer',
      'compute instance',
      'get',
      'iam',
    ];
    const times: number[] = [];
    for (const q of queries) {
      index.search(q);
      const t0 = performance.now();
      index.search(q, { limit: 50 });
      times.push(performance.now() - t0);
    }
    const worst = Math.max(...times);
    console.log(
      `[perf] index build+search-index: ${build.toFixed(1)} ms (runs ${builds.map((b) => b.toFixed(0)).join('/')}); ` +
        `search worst ${worst.toFixed(2)} ms, per-query ${times.map((t, i) => `${queries[i]}=${t.toFixed(2)}`).join(' ')}`,
    );
    expect(build).toBeLessThan(300);
    expect(worst).toBeLessThan(32);
  });
});
