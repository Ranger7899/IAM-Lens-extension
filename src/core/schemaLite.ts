/**
 * Zod-free half of the snapshot schema: types, hashing helpers and structural checks. Kept apart from
 * `schema.ts` so the side-panel's critical path never has to load zod.
 */

/** The only snapshot schema version this build understands. */
export const SUPPORTED_SCHEMA_VERSION = 1;

export interface SnapshotRole {
  name: string;
  title: string;
  description: string;
  stage: string;
  deleted?: true;
  /** Indices into `Snapshot.permissions`, sorted ascending, unique. */
  perms: number[];
}

export interface Snapshot {
  schemaVersion: typeof SUPPORTED_SCHEMA_VERSION;
  /** First 12 hex chars of `sha256`. */
  version: string;
  generatedAt: string;
  /** SHA-256 hex over the canonical content (see `canonicalContent`). */
  sha256: string;
  permissions: string[];
  roles: SnapshotRole[];
}

/**
 * Deterministic content string: fixed key order, no `generatedAt`.
 * MUST stay byte-identical to `canonicalContent` in scripts/build-snapshot.ts.
 */
export function canonicalContent(permissions: readonly string[], roles: readonly SnapshotRole[]): string {
  return JSON.stringify({
    permissions,
    roles: roles.map((r) => ({
      name: r.name,
      title: r.title,
      description: r.description,
      stage: r.stage,
      ...(r.deleted ? { deleted: true } : {}),
      perms: r.perms,
    })),
  });
}

/** SHA-256 hex of a string using WebCrypto (available in extension pages, workers and Node 20+). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  let out = '';
  for (const b of new Uint8Array(digest)) out += b.toString(16).padStart(2, '0');
  return out;
}

/** Structural checks the zod schema cannot express cheaply (index ranges, ordering, uniqueness). */
export function structuralErrors(snap: Snapshot): string[] {
  const errs: string[] = [];
  const { permissions, roles } = snap;
  for (let i = 1; i < permissions.length; i++) {
    if (permissions[i - 1] >= permissions[i]) {
      errs.push(`permissions not sorted/unique at ${i}`);
      break;
    }
  }
  const names = new Set<string>();
  for (const r of roles) {
    if (names.has(r.name)) errs.push(`duplicate role ${r.name}`);
    names.add(r.name);
    for (let j = 0; j < r.perms.length; j++) {
      const p = r.perms[j];
      if (p >= permissions.length) {
        errs.push(`${r.name}: index ${p} out of range`);
        break;
      }
      if (j > 0 && r.perms[j - 1] >= p) {
        errs.push(`${r.name}: perms not sorted/unique`);
        break;
      }
    }
    if (errs.length > 20) break;
  }
  return errs;
}

export class SnapshotValidationError extends Error {
  constructor(
    message: string,
    readonly reason: 'schema' | 'structure' | 'hash' | 'version' | 'manifest' | 'size' | 'stale',
  ) {
    super(message);
    this.name = 'SnapshotValidationError';
  }
}
