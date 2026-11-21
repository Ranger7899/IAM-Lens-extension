/** Role-vs-role and snapshot-vs-snapshot comparison. */
import type { IamIndex } from './model';
import type { Snapshot } from './schema';

export interface RoleDiff {
  onlyA: string[];
  onlyB: string[];
  shared: string[];
}

/** Permission names split into only-in-A / only-in-B / in-both. Inputs are sorted index arrays. */
export function diffSorted(a: ArrayLike<number>, b: ArrayLike<number>, names: readonly string[]): RoleDiff {
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  const shared: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      shared.push(names[a[i]]);
      i++;
      j++;
    } else if (a[i] < b[j]) onlyA.push(names[a[i++]]);
    else onlyB.push(names[b[j++]]);
  }
  while (i < a.length) onlyA.push(names[a[i++]]);
  while (j < b.length) onlyB.push(names[b[j++]]);
  return { onlyA, onlyB, shared };
}

/** Compares two roles of the same index by full name. Throws if a role is missing. */
export function diffRoles(index: IamIndex, a: string, b: string): RoleDiff {
  const ra = index.findRole(a);
  const rb = index.findRole(b);
  if (!ra) throw new Error(`Unknown role: ${a}`);
  if (!rb) throw new Error(`Unknown role: ${b}`);
  return diffSorted(ra.perms, rb.perms, index.permissions);
}

export interface RoleSummary {
  name: string;
  title: string;
  stage: string;
  deleted: boolean;
  permissionCount: number;
}

export interface RoleChange {
  name: string;
  title: string;
  addedPermissions: string[];
  removedPermissions: string[];
  /** Present only when the stage changed. */
  stage?: { from: string; to: string };
  /** Present only when deleted flag changed. */
  deleted?: { from: boolean; to: boolean };
}

export interface SnapshotDiff {
  rolesAdded: RoleSummary[];
  rolesRemoved: RoleSummary[];
  rolesChanged: RoleChange[];
  permissionsAdded: string[];
  permissionsRemoved: string[];
}

const summary = (r: Snapshot['roles'][number]): RoleSummary => ({
  name: r.name,
  title: r.title,
  stage: r.stage,
  deleted: r.deleted === true,
  permissionCount: r.perms.length,
});

/** What changed between two snapshots (e.g. previous vs current). */
export function diffSnapshots(oldSnap: Snapshot, newSnap: Snapshot): SnapshotDiff {
  const oldRoles = new Map(oldSnap.roles.map((r) => [r.name, r]));
  const newRoles = new Map(newSnap.roles.map((r) => [r.name, r]));
  const rolesAdded: RoleSummary[] = [];
  const rolesRemoved: RoleSummary[] = [];
  const rolesChanged: RoleChange[] = [];

  for (const [name, nr] of newRoles) {
    const or = oldRoles.get(name);
    if (!or) {
      rolesAdded.push(summary(nr));
      continue;
    }
    const oldNames = or.perms.map((i) => oldSnap.permissions[i]);
    const newNames = nr.perms.map((i) => newSnap.permissions[i]);
    const oldSet = new Set(oldNames);
    const newSet = new Set(newNames);
    const addedPermissions = newNames.filter((p) => !oldSet.has(p));
    const removedPermissions = oldNames.filter((p) => !newSet.has(p));
    const stageChanged = or.stage !== nr.stage;
    const deletedChanged = (or.deleted === true) !== (nr.deleted === true);
    if (addedPermissions.length || removedPermissions.length || stageChanged || deletedChanged) {
      rolesChanged.push({
        name,
        title: nr.title,
        addedPermissions,
        removedPermissions,
        ...(stageChanged ? { stage: { from: or.stage, to: nr.stage } } : {}),
        ...(deletedChanged ? { deleted: { from: or.deleted === true, to: nr.deleted === true } } : {}),
      });
    }
  }
  for (const [name, or] of oldRoles) if (!newRoles.has(name)) rolesRemoved.push(summary(or));

  const oldPerms = new Set(oldSnap.permissions);
  const newPerms = new Set(newSnap.permissions);
  return {
    rolesAdded,
    rolesRemoved,
    rolesChanged,
    permissionsAdded: newSnap.permissions.filter((p) => !oldPerms.has(p)),
    permissionsRemoved: oldSnap.permissions.filter((p) => !newPerms.has(p)),
  };
}
