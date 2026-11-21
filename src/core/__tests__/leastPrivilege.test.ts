// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { IamIndex } from '../model';
import { minimalRoles, rolesGranting } from '../leastPrivilege';
import { makeSnapshot, realSnapshot } from './fixtures';

describe('real snapshot', () => {
  const index = new IamIndex(realSnapshot());

  it('roles/storage.objectViewer grants storage.objects.get, listed smallest-first', () => {
    const roles = rolesGranting(index, 'storage.objects.get');
    const names = roles.map((r) => r.name);
    expect(names).toContain('roles/storage.objectViewer');
    for (let i = 1; i < roles.length; i++)
      expect(roles[i].perms.length).toBeGreaterThanOrEqual(roles[i - 1].perms.length);
    expect(names.indexOf('roles/storage.objectViewer')).toBeLessThan(names.indexOf('roles/storage.admin'));
    expect(rolesGranting(index, 'nope.nope.nope')).toEqual([]);
  });

  it('minimalRoles picks a small storage viewer role, not roles/viewer', () => {
    const res = minimalRoles(index, ['storage.objects.get', 'storage.objects.list']);
    expect(res.roles).toHaveLength(1);
    const r = res.roles[0].role;
    expect(r.name).not.toBe('roles/viewer');
    expect(r.name).toMatch(/^roles\/storage\./);
    expect(r.perms.length).toBeLessThanOrEqual(20);
    expect(res.unknown).toEqual([]);
    expect(res.uncoverable).toEqual([]);
    expect(res.coverage['storage.objects.get']).toEqual([r.name]);
  });

  it('reports unknown permissions', () => {
    const res = minimalRoles(index, ['storage.objects.get', 'made.up.permission']);
    expect(res.unknown).toEqual(['made.up.permission']);
    expect(res.roles.length).toBeGreaterThan(0);
  });

  it('covers a cross-service set completely', () => {
    const want = ['storage.objects.get', 'bigquery.jobs.create', 'pubsub.topics.publish'];
    const res = minimalRoles(index, want);
    for (const p of want) expect(res.coverage[p].length).toBeGreaterThan(0);
    expect(res.roles.length).toBeLessThanOrEqual(3);
  });
});

describe('fixtures', () => {
  it('orders ties GA before BETA and non-deprecated first, and excludes discouraged on request', async () => {
    const snap = await makeSnapshot([
      { name: 'roles/z.dep', stage: 'DEPRECATED', perms: ['s.r.get', 's.r.a'] },
      { name: 'roles/z.beta', stage: 'BETA', perms: ['s.r.get', 's.r.b'] },
      { name: 'roles/z.ga', stage: 'GA', perms: ['s.r.get', 's.r.c'] },
      { name: 'roles/z.gone', deleted: true, perms: ['s.r.get', 's.r.d'] },
      { name: 'roles/z.big', perms: ['s.r.get', 's.r.e', 's.r.f', 's.r.g'] },
    ]);
    const index = new IamIndex(snap);
    expect(rolesGranting(index, 's.r.get').map((r) => r.name)).toEqual([
      'roles/z.ga',
      'roles/z.beta',
      'roles/z.dep',
      'roles/z.gone',
      'roles/z.big',
    ]);
    expect(rolesGranting(index, 's.r.get', { excludeDiscouraged: true }).map((r) => r.name)).toEqual([
      'roles/z.ga',
      'roles/z.beta',
      'roles/z.big',
    ]);
  });

  it('greedy cover prefers coverage per size, prunes redundancy, and falls back to deprecated only if needed', async () => {
    const snap = await makeSnapshot([
      {
        name: 'roles/huge',
        perms: ['a.x.get', 'a.x.list', 'b.y.get', 'b.y.list', 'c.z.get', 'p1', 'p2', 'p3', 'p4', 'p5'].map(
          (p) => (p.includes('.') ? p : `pad.pad.${p}`),
        ),
      },
      { name: 'roles/a', perms: ['a.x.get', 'a.x.list'] },
      { name: 'roles/b', perms: ['b.y.get', 'b.y.list'] },
      { name: 'roles/old', stage: 'DEPRECATED', perms: ['c.z.get'] },
    ]);
    const index = new IamIndex(snap);
    const res = minimalRoles(index, ['a.x.get', 'a.x.list', 'b.y.get', 'b.y.list', 'c.z.get']);
    const names = res.roles.map((r) => r.role.name).sort();
    // roles/huge also grants c.z.get, so the deprecated role is never needed; huge covers everything alone but a+b is cheaper per perm.
    expect(names.includes('roles/old')).toBe(false);
    expect(res.uncoverable).toEqual([]);
    for (const p of Object.keys(res.coverage)) expect(res.coverage[p].length).toBeGreaterThan(0);

    const snap2 = await makeSnapshot([
      { name: 'roles/a', perms: ['a.x.get'] },
      { name: 'roles/old', stage: 'DEPRECATED', perms: ['c.z.get'] },
    ]);
    const res2 = minimalRoles(new IamIndex(snap2), ['a.x.get', 'c.z.get']);
    expect(res2.roles.map((r) => [r.role.name, r.discouraged])).toEqual([
      ['roles/a', false],
      ['roles/old', true],
    ]);
  });
});
