// Builds data/roles.snapshot.json + data/manifest.json from the GCP predefined roles list.
// Zero dependencies. Usage: node scripts/build-snapshot.ts [--check]
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const SNAPSHOT_PATH = join(DATA_DIR, 'roles.snapshot.json');
const MANIFEST_PATH = join(DATA_DIR, 'manifest.json');
const SCHEMA_VERSION = 1;

interface ApiRole {
  name: string;
  title?: string;
  description?: string;
  stage?: string;
  deleted?: boolean;
  includedPermissions?: string[];
}
interface SnapRole {
  name: string;
  title: string;
  description: string;
  stage: string;
  deleted?: true;
  perms: number[];
}
interface Snapshot {
  schemaVersion: number;
  version: string;
  generatedAt: string;
  sha256: string;
  permissions: string[];
  roles: SnapRole[];
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Deterministic content: fixed key order, no generatedAt.
function canonicalContent(permissions: string[], roles: SnapRole[]): string {
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

function getToken(): string {
  const env = process.env.GCP_ACCESS_TOKEN?.trim();
  if (env) return env;
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
}

function getQuotaProject(): string | undefined {
  const env = process.env.GCP_QUOTA_PROJECT?.trim();
  if (env) return env;
  try {
    const p = execFileSync('gcloud', ['config', 'get-value', 'project'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return p || undefined;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url: string, headers: Record<string, string>): Promise<string> {
  const maxAttempts = 6;
  for (let attempt = 1; ; attempt++) {
    let res: Response | undefined;
    let netErr: unknown;
    try {
      res = await fetch(url, { headers });
    } catch (e) {
      netErr = e;
    }
    if (res?.ok) return await res.text();
    const retryable = netErr !== undefined || res!.status === 429 || res!.status >= 500;
    const detail =
      netErr !== undefined ? String(netErr) : `HTTP ${res!.status}: ${(await res!.text()).slice(0, 1000)}`;
    if (!retryable || attempt >= maxAttempts)
      throw new Error(`roles.list failed (attempt ${attempt}): ${detail}`);
    const retryAfter = Number(res?.headers.get('retry-after'));
    const delay =
      retryAfter > 0 ? retryAfter * 1000 : Math.min(30000, 500 * 2 ** attempt) + Math.random() * 250;
    console.warn(`  retrying in ${Math.round(delay)}ms after: ${detail.slice(0, 200)}`);
    await sleep(delay);
  }
}

async function fetchAllRoles(): Promise<{ roles: ApiRole[]; rawBytes: number }> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${getToken()}`,
    accept: 'application/json',
  };
  const quota = getQuotaProject();
  const roles: ApiRole[] = [];
  let rawBytes = 0;
  let pageToken = '';
  let useQuota = false;
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ view: 'FULL', pageSize: '1000' });
    if (pageToken) qs.set('pageToken', pageToken);
    const url = `https://iam.googleapis.com/v1/roles?${qs}`;
    let text: string;
    try {
      text = await fetchPage(url, useQuota && quota ? { ...headers, 'x-goog-user-project': quota } : headers);
    } catch (e) {
      // Fall back to a quota project only when one is configured (user creds often need it).
      if (!useQuota && quota && /HTTP 40[03]/.test(String(e))) {
        console.warn(`  retrying with x-goog-user-project=${quota}`);
        useQuota = true;
        text = await fetchPage(url, { ...headers, 'x-goog-user-project': quota });
      } else throw e;
    }
    rawBytes += Buffer.byteLength(text);
    const body = JSON.parse(text) as { roles?: ApiRole[]; nextPageToken?: string };
    roles.push(...(body.roles ?? []));
    console.log(`  page ${page}: ${body.roles?.length ?? 0} roles`);
    if (!body.nextPageToken) break;
    pageToken = body.nextPageToken;
  }
  return { roles, rawBytes };
}

function build(apiRoles: ApiRole[]): Snapshot {
  const permSet = new Set<string>();
  for (const r of apiRoles) for (const p of r.includedPermissions ?? []) permSet.add(p);
  const permissions = [...permSet].sort();
  const index = new Map(permissions.map((p, i) => [p, i]));
  const seen = new Set<string>();
  const roles: SnapRole[] = [];
  for (const r of apiRoles) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    const perms = [...new Set((r.includedPermissions ?? []).map((p) => index.get(p)!))].sort((a, b) => a - b);
    roles.push({
      name: r.name,
      title: r.title ?? '',
      description: r.description ?? '',
      stage: r.stage ?? 'GA',
      ...(r.deleted ? { deleted: true as const } : {}),
      perms,
    });
  }
  roles.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const sha256 = sha256Hex(canonicalContent(permissions, roles));
  return {
    schemaVersion: SCHEMA_VERSION,
    version: sha256.slice(0, 12),
    generatedAt: new Date().toISOString(),
    sha256,
    permissions,
    roles,
  };
}

function validate(snap: Snapshot): string[] {
  const errs: string[] = [];
  if (snap.schemaVersion !== SCHEMA_VERSION)
    errs.push(`schemaVersion ${snap.schemaVersion} != ${SCHEMA_VERSION}`);
  const { permissions, roles } = snap;
  for (let i = 1; i < permissions.length; i++) {
    if (permissions[i - 1] === permissions[i]) errs.push(`duplicate permission ${permissions[i]}`);
    else if (permissions[i - 1] > permissions[i]) errs.push(`permissions not sorted at ${i}`);
  }
  const names = new Set<string>();
  for (let i = 0; i < roles.length; i++) {
    const r = roles[i];
    if (i > 0 && roles[i - 1].name >= r.name) errs.push(`roles not sorted/unique at ${r.name}`);
    if (names.has(r.name)) errs.push(`duplicate role ${r.name}`);
    names.add(r.name);
    for (let j = 0; j < r.perms.length; j++) {
      const p = r.perms[j];
      if (!Number.isInteger(p) || p < 0 || p >= permissions.length)
        errs.push(`${r.name}: index ${p} out of range`);
      if (j > 0 && r.perms[j - 1] >= p) errs.push(`${r.name}: perms not sorted/unique at ${j}`);
    }
  }
  const sha = sha256Hex(canonicalContent(permissions, roles));
  if (sha !== snap.sha256) errs.push(`sha256 mismatch: stored ${snap.sha256}, computed ${sha}`);
  if (snap.version !== sha.slice(0, 12))
    errs.push(`version ${snap.version} != sha prefix ${sha.slice(0, 12)}`);
  if (roles.length === 0 || permissions.length === 0) errs.push('empty snapshot');
  return errs;
}

function check(): number {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.error(`missing ${SNAPSHOT_PATH}`);
    return 1;
  }
  const raw = readFileSync(SNAPSHOT_PATH, 'utf8');
  const snap = JSON.parse(raw) as Snapshot;
  const errs = validate(snap);
  if (existsSync(MANIFEST_PATH)) {
    const m = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    if (m.sha256 !== snap.sha256 || m.version !== snap.version) errs.push('manifest does not match snapshot');
    if (m.roleCount !== snap.roles.length || m.permissionCount !== snap.permissions.length)
      errs.push('manifest counts mismatch');
    if (m.bytes !== Buffer.byteLength(raw))
      errs.push(`manifest bytes ${m.bytes} != file ${Buffer.byteLength(raw)}`);
  } else errs.push('missing manifest.json');
  if (errs.length) {
    console.error(`CHECK FAILED (${errs.length} problems):`);
    for (const e of errs.slice(0, 50)) console.error(`  - ${e}`);
    return 1;
  }
  console.log(
    `CHECK OK: version ${snap.version}, ${snap.roles.length} roles, ${snap.permissions.length} permissions`,
  );
  return 0;
}

async function main() {
  if (process.argv.includes('--check')) process.exit(check());
  console.log('Fetching predefined roles...');
  const { roles: apiRoles, rawBytes } = await fetchAllRoles();
  if (apiRoles.length < 100)
    throw new Error(`suspiciously few roles (${apiRoles.length}); refusing to write`);
  let snap = build(apiRoles);
  // Keep generatedAt stable when content is unchanged, so data/ doesn't change needlessly.
  if (existsSync(SNAPSHOT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
      if (prev.sha256 === snap.sha256) snap = { ...snap, generatedAt: prev.generatedAt };
    } catch {
      /* ignore corrupt previous */
    }
  }
  const errs = validate(snap);
  if (errs.length) throw new Error(`built snapshot invalid: ${errs.slice(0, 5).join('; ')}`);
  const out = JSON.stringify(snap);
  const bytes = Buffer.byteLength(out);
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    version: snap.version,
    sha256: snap.sha256,
    generatedAt: snap.generatedAt,
    roleCount: snap.roles.length,
    permissionCount: snap.permissions.length,
    bytes,
  };
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SNAPSHOT_PATH, out);
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest) + '\n');
  const gz = gzipSync(out).length;
  console.log(`roles: ${snap.roles.length}`);
  console.log(`permissions: ${snap.permissions.length}`);
  console.log(`version: ${snap.version}`);
  console.log(`raw API bytes: ${rawBytes}`);
  console.log(`output bytes: ${bytes} (${((bytes / rawBytes) * 100).toFixed(1)}% of raw)`);
  console.log(`gzip bytes: ${gz}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
