import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalContent, sha256Hex, type Snapshot, type SnapshotRole } from '../schema';

let real: Snapshot | undefined;
/** The real bundled snapshot (parsed once, not validated here). */
export function realSnapshot(): Snapshot {
  real ??= JSON.parse(readFileSync(join(process.cwd(), 'data/roles.snapshot.json'), 'utf8')) as Snapshot;
  return real;
}

export interface TinyRole {
  name: string;
  title?: string;
  description?: string;
  stage?: string;
  deleted?: true;
  perms: string[];
}

/** Builds a small, valid, correctly hashed snapshot from permission names. */
export async function makeSnapshot(
  roles: TinyRole[],
  generatedAt = '2026-01-01T00:00:00.000Z',
): Promise<Snapshot> {
  const permissions = [...new Set(roles.flatMap((r) => r.perms))].sort();
  const idx = new Map(permissions.map((p, i) => [p, i]));
  const snapRoles: SnapshotRole[] = roles
    .map((r) => ({
      name: r.name,
      title: r.title ?? r.name,
      description: r.description ?? '',
      stage: r.stage ?? 'GA',
      ...(r.deleted ? { deleted: true as const } : {}),
      perms: [...new Set(r.perms.map((p) => idx.get(p)!))].sort((a, b) => a - b),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
  const sha256 = await sha256Hex(canonicalContent(permissions, snapRoles));
  return {
    schemaVersion: 1,
    version: sha256.slice(0, 12),
    generatedAt,
    sha256,
    permissions,
    roles: snapRoles,
  };
}
