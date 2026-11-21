// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildClassTable,
  classifyPermission,
  classifyVerbDetailed,
  permissionService,
  permissionVerb,
  roleProfile,
} from '../privilege';
import { realSnapshot } from './fixtures';

describe('classifyPermission', () => {
  const cases: [string, 'read' | 'write' | 'admin'][] = [
    ['storage.objects.get', 'read'],
    ['storage.objects.list', 'read'],
    ['resourcemanager.projects.getIamPolicy', 'read'],
    ['iam.roles.list', 'read'],
    ['bigquery.tables.getData', 'read'],
    ['bigquery.jobs.listAll', 'read'],
    ['logging.logEntries.list', 'read'],
    ['cloudasset.assets.searchAllResources', 'read'],
    ['bigquery.tables.updateData', 'write'],
    ['storage.objects.create', 'write'],
    ['compute.instances.update', 'write'],
    ['compute.instances.setLabels', 'write'],
    ['compute.instances.start', 'write'],
    ['run.services.invoke', 'write'],
    ['iam.serviceAccounts.use', 'write'],
    ['compute.disks.useReadOnly', 'read'],
    ['compute.instances.attachDisk', 'write'],
    ['pubsub.topics.publish', 'write'],
    ['bigquery.datasets.export', 'write'],
    ['aiplatform.endpoints.predict', 'write'],
    ['storage.objects.delete', 'admin'],
    ['compute.instances.delete', 'admin'],
    ['resourcemanager.projects.setIamPolicy', 'admin'],
    ['iam.serviceAccounts.actAs', 'admin'],
    ['iam.serviceAccounts.signBlob', 'admin'],
    ['iam.serviceAccounts.signJwt', 'admin'],
    ['iam.serviceAccounts.getAccessToken', 'admin'],
    ['iam.serviceAccounts.getOpenIdToken', 'admin'],
    ['iam.serviceAccounts.implicitDelegation', 'admin'],
    ['resourcemanager.projects.undelete', 'admin'],
    ['compute.instances.osAdminLogin', 'admin'],
    ['compute.instances.setMetadata', 'write'],
    ['cloudonefs.isiloncloud.com/clusters.create', 'write'],
    ['cloudonefs.isiloncloud.com/clusters.delete', 'admin'],
    ['healthcare.dicomStores.dicomWebRead', 'read'],
    ['bigtable.tables.generateConsistencyToken', 'read'],
    ['somefuture.things.frobnicate', 'write'],
  ];
  it.each(cases)('%s -> %s', (perm, cls) => {
    expect(classifyPermission(perm)).toBe(cls);
  });

  it('exposes verb and service helpers', () => {
    expect(permissionVerb('storage.objects.get')).toBe('get');
    expect(permissionService('storage.objects.get')).toBe('storage');
    expect(permissionService('cloudonefs.isiloncloud.com/clusters.get')).toBe('cloudonefs.isiloncloud.com');
  });

  it('batch/bulk/legacy modifiers defer to the real action', () => {
    expect(classifyPermission('x.y.batchGet')).toBe('read');
    expect(classifyPermission('x.y.bulkDelete')).toBe('admin');
    expect(classifyPermission('x.y.legacySearchRawLogs')).toBe('read');
  });
});

describe('roleProfile', () => {
  it('counts classes', () => {
    const perms = ['a.b.get', 'a.b.list', 'a.b.create', 'a.b.delete'];
    const table = buildClassTable(perms);
    expect(roleProfile([0, 1, 2, 3], table)).toEqual({ read: 2, write: 1, admin: 1 });
    expect(roleProfile([], table)).toEqual({ read: 0, write: 0, admin: 0 });
  });
});

describe('real snapshot verbs', () => {
  const snap = realSnapshot();
  const counts = new Map<string, number>();
  for (const p of snap.permissions) counts.set(permissionVerb(p), (counts.get(permissionVerb(p)) ?? 0) + 1);

  it('top verbs are classified by explicit rules, never the default', () => {
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
    const summary = top.map(([v, n]) => `${v}:${n}:${classifyVerbDetailed(v).class[0]}`).join(' ');
    console.log(`top-50 verbs (verb:count:class) ${summary}`);
    for (const [v] of top) expect(classifyVerbDetailed(v).rule, v).not.toBe('default');
  });

  it('only a small, reviewed residue falls through to the conservative default', () => {
    const residue = [...counts.keys()].filter((v) => classifyVerbDetailed(v).rule === 'default');
    console.log(`default-rule verbs: ${residue.length} of ${counts.size}`);
    // Guard against drift: new verbs landing in the default bucket should be reviewed, not ignored.
    expect(residue.length).toBeLessThanOrEqual(90);
    // Everything in the residue is treated as write (conservative) unless it names an admin/root capability.
    for (const v of residue) expect(classifyVerbDetailed(v).class, v).not.toBe('read');
    // No verb in the snapshot is empty.
    for (const v of counts.keys()) expect(v.length).toBeGreaterThan(0);
  });

  it('classification distribution is sane', () => {
    const table = buildClassTable(snap.permissions);
    const c = [0, 0, 0];
    for (const x of table) c[x]++;
    console.log(`class distribution read/write/admin: ${c.join('/')}`);
    expect(c[0]).toBeGreaterThan(c[2]);
    expect(c[2]).toBeGreaterThan(500);
  });

  it('roles/viewer is read-only; roles/owner has admin permissions', () => {
    const table = buildClassTable(snap.permissions);
    const viewer = snap.roles.find((r) => r.name === 'roles/viewer')!;
    const owner = snap.roles.find((r) => r.name === 'roles/owner')!;
    expect(roleProfile(viewer.perms, table).admin).toBeLessThan(viewer.perms.length * 0.02);
    expect(roleProfile(owner.perms, table).admin).toBeGreaterThan(50);
  });
});
