// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { diffRoles, diffSnapshots } from '../diff';
import { IamIndex } from '../model';
import { makeSnapshot } from './fixtures';

describe('diffRoles', () => {
  it('splits onlyA / onlyB / shared', async () => {
    const snap = await makeSnapshot([
      { name: 'roles/a', perms: ['s.r.get', 's.r.list', 's.r.update'] },
      { name: 'roles/b', perms: ['s.r.get', 's.r.create'] },
      { name: 'roles/empty', perms: [] },
    ]);
    const index = new IamIndex(snap);
    const d = diffRoles(index, 'roles/a', 'roles/b');
    expect(d.shared).toEqual(['s.r.get']);
    expect(d.onlyA.sort()).toEqual(['s.r.list', 's.r.update']);
    expect(d.onlyB).toEqual(['s.r.create']);
    expect(diffRoles(index, 'roles/empty', 'roles/b').onlyB).toHaveLength(2);
    expect(() => diffRoles(index, 'roles/a', 'roles/missing')).toThrow(/Unknown role/);
  });
});

describe('diffSnapshots', () => {
  it('reports added/removed/changed roles and permissions', async () => {
    const oldSnap = await makeSnapshot([
      { name: 'roles/keep', perms: ['s.r.get'] },
      { name: 'roles/changed', perms: ['s.r.get', 's.r.old'] },
      { name: 'roles/removed', title: 'Gone', perms: ['s.r.get'] },
      { name: 'roles/stage', stage: 'BETA', perms: ['s.r.get'] },
    ]);
    const newSnap = await makeSnapshot(
      [
        { name: 'roles/keep', perms: ['s.r.get'] },
        { name: 'roles/changed', perms: ['s.r.get', 's.r.new'] },
        { name: 'roles/added', title: 'New', perms: ['s.r.get', 's.r.brandnew'] },
        { name: 'roles/stage', stage: 'GA', perms: ['s.r.get'] },
      ],
      '2026-02-01T00:00:00.000Z',
    );
    const d = diffSnapshots(oldSnap, newSnap);
    expect(d.rolesAdded.map((r) => [r.name, r.permissionCount])).toEqual([['roles/added', 2]]);
    expect(d.rolesRemoved.map((r) => r.name)).toEqual(['roles/removed']);
    expect(d.rolesChanged).toEqual([
      {
        name: 'roles/changed',
        title: 'roles/changed',
        addedPermissions: ['s.r.new'],
        removedPermissions: ['s.r.old'],
      },
      {
        name: 'roles/stage',
        title: 'roles/stage',
        addedPermissions: [],
        removedPermissions: [],
        stage: { from: 'BETA', to: 'GA' },
      },
    ]);
    expect(d.permissionsAdded.sort()).toEqual(['s.r.brandnew', 's.r.new']);
    expect(d.permissionsRemoved).toEqual(['s.r.old']);
  });

  it('identical snapshots produce an empty diff', async () => {
    const s = await makeSnapshot([{ name: 'roles/a', perms: ['s.r.get'] }]);
    expect(diffSnapshots(s, s)).toEqual({
      rolesAdded: [],
      rolesRemoved: [],
      rolesChanged: [],
      permissionsAdded: [],
      permissionsRemoved: [],
    });
  });
});
