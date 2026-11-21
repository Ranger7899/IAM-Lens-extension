// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { IamIndex } from '../model';
import {
  isDiscouraged,
  isLegacyRole,
  isServiceAgentRole,
  minimalRoles,
  rolesGranting,
} from '../leastPrivilege';
import type { RoleRecord } from '../model';
import { makeSnapshot, realSnapshot } from './fixtures';

describe('real snapshot', () => {
  const index = new IamIndex(realSnapshot());

  it("rolesGranting puts the permission's own service first", () => {
    const roles = rolesGranting(index, 'storage.objects.get');
    const names = roles.map((r) => r.name);
    expect(names[0]).toMatch(/^roles\/storage\./);
    expect(names).toContain('roles/storage.objectViewer');
    // storage.* roles come before any ordinary non-storage role
    const firstOther = roles.findIndex((r) => !r.name.startsWith('roles/storage.') && !isServiceAgentRole(r));
    const lastStorage = roles
      .map((r) => r.name.startsWith('roles/storage.') && !isServiceAgentRole(r))
      .lastIndexOf(true);
    expect(lastStorage).toBeLessThan(firstOther);
    expect(rolesGranting(index, 'nope.nope.nope')).toEqual([]);
  });

  it('isLegacyRole flags legacy roles so the badge can skip them', () => {
    expect(isLegacyRole(index.role('roles/storage.legacyObjectReader')!)).toBe(true);
    expect(isLegacyRole(index.role('roles/storage.objectViewer')!)).toBe(false);
    const eligible = rolesGranting(index, 'storage.objects.get').filter(
      (r) => !isServiceAgentRole(r) && !isDiscouraged(r),
    );
    expect((eligible.find((r) => !isLegacyRole(r)) ?? eligible[0]).name).toBe('roles/storage.objectViewer');
  });

  it('preferService: false is strictly smallest-first among ordinary roles', () => {
    const roles = rolesGranting(index, 'storage.objects.get', { preferService: false }).filter(
      (r) => !isServiceAgentRole(r) && !isDiscouraged(r),
    );
    for (let i = 1; i < roles.length; i++)
      expect(roles[i].perms.length).toBeGreaterThanOrEqual(roles[i - 1].perms.length);
  });

  it('agent-like roles never lead; pubsub.topics.publish -> roles/pubsub.publisher', () => {
    expect(rolesGranting(index, 'pubsub.topics.publish')[0].name).toBe('roles/pubsub.publisher');
    for (const p of ['run.services.get', 'storage.objects.list', 'bigquery.tables.getData'])
      expect(isServiceAgentRole(rolesGranting(index, p)[0])).toBe(false);
  });

  it('flags agent-like roles', () => {
    const r = (name: string, title = name) => ({ name, title, stage: 'GA' }) as RoleRecord;
    expect(isServiceAgentRole(r('roles/apigee.runtimeAgent'))).toBe(true);
    expect(isServiceAgentRole(r('roles/x.y', 'Storage Annotation Generator Service'))).toBe(true);
    expect(isServiceAgentRole(r('roles/storage.objectViewer', 'Storage Object Viewer'))).toBe(false);
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

  it('minimalRoles prefers GA people roles over BETA and agent roles', () => {
    expect(
      minimalRoles(index, ['storage.objects.get', 'storage.objects.list']).roles.map((c) => c.role.name),
    ).toEqual(['roles/storage.objectViewer']);
    const bq = minimalRoles(index, ['bigquery.tables.getData']).roles;
    expect(bq).toHaveLength(1);
    expect(bq[0].role.name).toMatch(/^roles\/bigquery\./);
    expect(bq[0].role.stage).toBe('GA');
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
  it('orders GA before BETA, deprecated/deleted last, and excludes discouraged on request', async () => {
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
      'roles/z.big',
      'roles/z.beta',
      'roles/z.dep',
      'roles/z.gone',
    ]);
    expect(rolesGranting(index, 's.r.get', { excludeDiscouraged: true }).map((r) => r.name)).toEqual([
      'roles/z.ga',
      'roles/z.big',
      'roles/z.beta',
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

  it('service tier first, toggled off by preferService: false; agent-like roles after ordinary ones', async () => {
    const snap = await makeSnapshot([
      { name: 'roles/other.tiny', perms: ['svc.r.get'] },
      { name: 'roles/svc.big', perms: ['svc.r.get', 'svc.r.a', 'svc.r.b'] },
      { name: 'roles/svc.serviceAgent', perms: ['svc.r.get'] },
      { name: 'roles/svc.betaSmall', stage: 'BETA', perms: ['svc.r.get', 'svc.r.c'] },
    ]);
    const index = new IamIndex(snap);
    expect(rolesGranting(index, 'svc.r.get').map((r) => r.name)).toEqual([
      'roles/svc.big',
      'roles/svc.betaSmall',
      'roles/other.tiny',
      'roles/svc.serviceAgent',
    ]);
    expect(rolesGranting(index, 'svc.r.get', { preferService: false }).map((r) => r.name)).toEqual([
      'roles/other.tiny',
      'roles/svc.betaSmall',
      'roles/svc.big',
      'roles/svc.serviceAgent',
    ]);
  });
});
