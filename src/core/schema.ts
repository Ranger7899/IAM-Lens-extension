/** Zod schemas and integrity checks for the IAM snapshot and the remote manifest. */
import { z } from 'zod';
import {
  SUPPORTED_SCHEMA_VERSION,
  SnapshotValidationError,
  canonicalContent,
  sha256Hex,
  structuralErrors,
  type Snapshot,
  type SnapshotRole,
} from './schemaLite';

export {
  SUPPORTED_SCHEMA_VERSION,
  SnapshotValidationError,
  canonicalContent,
  sha256Hex,
  structuralErrors,
  type Snapshot,
  type SnapshotRole,
};

export const roleStageSchema = z.string().min(1);

export const snapshotRoleSchema = z.object({
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  stage: roleStageSchema,
  deleted: z.literal(true).optional(),
  /** Indices into `Snapshot.permissions`, sorted ascending, unique. */
  perms: z.array(z.number().int().nonnegative()),
});

export const snapshotSchema = z.object({
  schemaVersion: z.literal(SUPPORTED_SCHEMA_VERSION),
  /** First 12 hex chars of `sha256`. */
  version: z.string().regex(/^[0-9a-f]{12}$/),
  generatedAt: z.string().min(1),
  /** SHA-256 hex over the canonical content (see `canonicalContent`). */
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  permissions: z.array(z.string().min(1)).min(1),
  roles: z.array(snapshotRoleSchema).min(1),
});

/** `manifest.json`, published next to the snapshot. */
export const remoteManifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  version: z.string().regex(/^[0-9a-f]{12}$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  generatedAt: z.string().min(1),
  roleCount: z.number().int().nonnegative().optional(),
  permissionCount: z.number().int().nonnegative().optional(),
  bytes: z.number().int().nonnegative().optional(),
  /** Optional override of where the snapshot lives (resolved relative to the manifest URL). */
  url: z.string().optional(),
});

export type RemoteManifest = z.infer<typeof remoteManifestSchema>;

/** Validates shape only (zod + structure). Use `verifySnapshotHash` for authenticity. */
export function parseSnapshot(input: unknown): Snapshot {
  const res = snapshotSchema.safeParse(input);
  if (!res.success) {
    throw new SnapshotValidationError(
      `Invalid snapshot: ${z.prettifyError(res.error).slice(0, 500)}`,
      'schema',
    );
  }
  const errs = structuralErrors(res.data);
  if (errs.length > 0) {
    throw new SnapshotValidationError(
      `Invalid snapshot structure: ${errs.slice(0, 5).join('; ')}`,
      'structure',
    );
  }
  return res.data;
}

/** Throws unless the stored sha256/version match the recomputed canonical hash. */
export async function verifySnapshotHash(snap: Snapshot): Promise<void> {
  const actual = await sha256Hex(canonicalContent(snap.permissions, snap.roles));
  if (actual !== snap.sha256) {
    throw new SnapshotValidationError(`sha256 mismatch: stored ${snap.sha256}, computed ${actual}`, 'hash');
  }
  if (snap.version !== actual.slice(0, 12)) {
    throw new SnapshotValidationError(`version ${snap.version} does not match hash prefix`, 'version');
  }
}

export function parseManifest(input: unknown): RemoteManifest {
  const res = remoteManifestSchema.safeParse(input);
  if (!res.success) {
    throw new SnapshotValidationError(
      `Invalid manifest: ${z.prettifyError(res.error).slice(0, 500)}`,
      'manifest',
    );
  }
  return res.data;
}
