import { describe, expect, it } from 'vitest';
import { classifyQuery } from '../query';

describe('classifyQuery', () => {
  it('roles', () => {
    expect(classifyQuery('roles/viewer')).toEqual({ kind: 'role', id: 'roles/viewer' });
    expect(classifyQuery('  roles/storage.objectViewer ')).toEqual({
      kind: 'role',
      id: 'roles/storage.objectViewer',
    });
    expect(classifyQuery('projects/my-proj/roles/custom1')).toEqual({
      kind: 'role',
      id: 'projects/my-proj/roles/custom1',
    });
    expect(classifyQuery('organizations/123456/roles/orgRole.x_y')).toEqual({
      kind: 'role',
      id: 'organizations/123456/roles/orgRole.x_y',
    });
  });
  it('single permission', () => {
    expect(classifyQuery('storage.objects.get')).toEqual({
      kind: 'permission',
      permission: 'storage.objects.get',
      partial: false,
    });
    expect(classifyQuery('objects.get')).toEqual({
      kind: 'permission',
      permission: 'objects.get',
      partial: true,
    });
    expect(classifyQuery('storage.objects.*')).toEqual({
      kind: 'permission',
      permission: 'storage.objects.*',
      partial: true,
    });
    expect(classifyQuery('"storage.objects.get",')).toMatchObject({
      kind: 'permission',
      permission: 'storage.objects.get',
    });
    expect(classifyQuery('cloudonefs.isiloncloud.com/clusters.create')).toMatchObject({ kind: 'permission' });
  });
  it('multi permissions', () => {
    expect(classifyQuery('storage.objects.get storage.objects.list')).toEqual({
      kind: 'multi',
      perms: ['storage.objects.get', 'storage.objects.list'],
    });
    expect(classifyQuery('a.b.get, a.b.list,\n a.b.get')).toEqual({
      kind: 'multi',
      perms: ['a.b.get', 'a.b.list'],
    });
    expect(classifyQuery('["a.b.get"; "a.b.create"]')).toEqual({
      kind: 'multi',
      perms: ['a.b.get', 'a.b.create'],
    });
  });
  it('free text', () => {
    expect(classifyQuery('bigquery admin')).toEqual({ kind: 'text', text: 'bigquery admin' });
    expect(classifyQuery('storage')).toEqual({ kind: 'text', text: 'storage' });
    expect(classifyQuery('storage.objects.get and more')).toMatchObject({ kind: 'text' });
    expect(classifyQuery('')).toEqual({ kind: 'text', text: '' });
    expect(classifyQuery('roles/')).toMatchObject({ kind: 'text' });
  });
});
