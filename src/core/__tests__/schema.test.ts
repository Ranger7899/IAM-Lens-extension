// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  SnapshotValidationError,
  canonicalContent,
  parseManifest,
  parseSnapshot,
  sha256Hex,
  verifySnapshotHash,
} from '../schema';
import { makeSnapshot, realSnapshot } from './fixtures';

describe('schema', () => {
  it('parses and hash-verifies the real snapshot exactly as build-snapshot.ts computes it', async () => {
    const snap = parseSnapshot(realSnapshot());
    expect(snap.roles.length).toBe(2437);
    await verifySnapshotHash(snap);
    expect(await sha256Hex(canonicalContent(snap.permissions, snap.roles))).toBe(snap.sha256);
  });

  it('parses the real manifest', async () => {
    const { readFileSync } = await import('node:fs');
    const m = parseManifest(JSON.parse(readFileSync('data/manifest.json', 'utf8')));
    expect(m.sha256).toBe(realSnapshot().sha256);
  });

  it('rejects bad shape and structure', async () => {
    const good = await makeSnapshot([{ name: 'roles/a', perms: ['s.r.get', 's.r.list'] }]);
    expect(() => parseSnapshot({ ...good, schemaVersion: 2 })).toThrow(SnapshotValidationError);
    expect(() => parseSnapshot({ ...good, sha256: 'xyz' })).toThrow(SnapshotValidationError);
    const oob = { ...good, roles: [{ ...good.roles[0], perms: [0, 99] }] };
    expect(() => parseSnapshot(oob)).toThrow(/out of range/);
    const unsorted = { ...good, roles: [{ ...good.roles[0], perms: [1, 0] }] };
    expect(() => parseSnapshot(unsorted)).toThrow(/sorted/);
    expect(() => parseSnapshot(null)).toThrow(SnapshotValidationError);
  });

  it('detects content tampering via hash', async () => {
    const good = await makeSnapshot([{ name: 'roles/a', perms: ['s.r.get'] }]);
    const tampered = { ...good, roles: [{ ...good.roles[0], description: 'evil' }] };
    await expect(verifySnapshotHash(parseSnapshot(tampered))).rejects.toMatchObject({ reason: 'hash' });
  });
});
