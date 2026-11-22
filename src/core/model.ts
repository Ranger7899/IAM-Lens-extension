/**
 * In-memory index over an IAM snapshot (plus optional custom roles).
 *
 * Roles are stored as sorted `Int32Array`s of permission indices. The permission -> roles inverted
 * index is a CSR layout (`offsets` + `data`) so lookups return zero-copy subarrays.
 */
import MiniSearch from 'minisearch';
import {
  buildClassTable,
  permissionService,
  permissionVerb,
  roleProfile,
  type PrivilegeClass,
  type PrivilegeProfile,
} from './privilege';
import type { Snapshot } from './schema';

export type RoleSource = { kind: 'predefined' } | { kind: 'custom'; parent: string };

export interface RoleRecord {
  /** Position in `IamIndex.roles`. */
  idx: number;
  name: string;
  title: string;
  description: string;
  stage: string;
  deleted: boolean;
  /** Permission indices, sorted ascending. */
  perms: Int32Array;
  source: RoleSource;
}

/** A custom role: same fields as a snapshot role but permissions are names, since a custom role may use unknown ones. */
export interface CustomRoleInput {
  /** `projects/<p>/roles/<id>` or `organizations/<o>/roles/<id>`. */
  name: string;
  title?: string;
  description?: string;
  stage?: string;
  deleted?: boolean;
  perms: string[];
  source: { kind: 'custom'; parent: string };
}

export interface RoleHit {
  role: RoleRecord;
  score: number;
}
export interface PermissionHit {
  /** Permission index. */
  index: number;
  permission: string;
  score: number;
}
export interface SearchResult {
  roles: RoleHit[];
  permissions: PermissionHit[];
}
export interface SearchOptions {
  /** Max hits per list (default 20). */
  limit?: number;
}

export interface ServiceGroup {
  service: string;
  /** Permission indices, in permission-name order. */
  indices: number[];
  permissions: string[];
  profile: PrivilegeProfile;
}

const NUMBER_FIELDS = ['name', 'title', 'description'] as const;

/** Splits on separators and camelCase boundaries; also keeps the whole lower-cased token. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s/._:@,;()[\]{}'"`-]+/)) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    out.push(lower);
    if (/[a-z][A-Z]|[A-Z]{2}[a-z]/.test(raw)) {
      for (const part of raw
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(' ')) {
        const p = part.toLowerCase();
        if (p && p !== lower) out.push(p);
      }
    }
  }
  return out;
}

const STAGE_FACTOR: Record<string, number> = { GA: 1, BETA: 0.9, ALPHA: 0.8, DEPRECATED: 0.5 };

/** Score added to a role whose ID service segment (`roles/<service>.`) equals a query token. */
const SERVICE_MATCH_BOOST = 15;

/** `roles/storage.viewer` -> `storage`; empty for `roles/viewer`. */
function roleServiceSegment(lowerName: string): string {
  if (!lowerName.startsWith('roles/')) return '';
  const dot = lowerName.indexOf('.', 6);
  return dot < 0 ? '' : lowerName.slice(6, dot);
}

interface RoleSearchDoc {
  id: number;
  name: string;
  title: string;
  description: string;
}
interface PermSearchDoc {
  id: number;
  text: string;
}
interface SearchBuild<T extends { id: number }> {
  ms: MiniSearch<T>;
  docs: T[];
  next: number;
}

/** Adds documents until `budgetMs` has passed; true once all are in. */
function advance<T extends { id: number }>(b: SearchBuild<T>, budgetMs: number): boolean {
  const deadline = performance.now() + budgetMs;
  while (b.next < b.docs.length) {
    const end = Math.min(b.docs.length, b.next + 100);
    for (; b.next < end; b.next++) b.ms.add(b.docs[b.next]);
    if (b.next < b.docs.length && performance.now() >= deadline) return false;
  }
  return true;
}

const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));

export class IamIndex {
  readonly version: string;
  /** Permission names; the snapshot's table first, then any extra permissions only custom roles use. */
  readonly permissions: string[];
  readonly roles: RoleRecord[];
  /** Role indices ordered by ascending permission count (ties by name). */
  readonly rolesBySize: Int32Array;
  /** One byte per permission: 0 read, 1 write, 2 admin. */
  readonly classTable: Uint8Array;

  private roleMaxClasses?: Uint8Array;
  private readonly permIndex: Map<string, number>;
  private readonly roleIndex: Map<string, number>;
  private readonly offsets: Int32Array;
  private readonly data: Int32Array;
  private roleSearch?: MiniSearch<RoleSearchDoc>;
  private permSearch?: MiniSearch<PermSearchDoc>;

  constructor(snapshot: Snapshot, customRoles: readonly CustomRoleInput[] = []) {
    this.version = snapshot.version;
    this.permissions = snapshot.permissions.slice();
    this.permIndex = new Map();
    for (let i = 0; i < this.permissions.length; i++) this.permIndex.set(this.permissions[i], i);

    this.roles = [];
    this.roleIndex = new Map();
    for (const r of snapshot.roles) {
      this.addRole({
        name: r.name,
        title: r.title,
        description: r.description,
        stage: r.stage,
        deleted: r.deleted === true,
        perms: Int32Array.from(r.perms),
        source: { kind: 'predefined' },
      });
    }
    for (const c of customRoles) {
      if (this.roleIndex.has(c.name)) continue;
      const idxs = new Set<number>();
      for (const p of c.perms) {
        let i = this.permIndex.get(p);
        if (i === undefined) {
          i = this.permissions.length;
          this.permissions.push(p);
          this.permIndex.set(p, i);
        }
        idxs.add(i);
      }
      this.addRole({
        name: c.name,
        title: c.title ?? '',
        description: c.description ?? '',
        stage: c.stage ?? 'GA',
        deleted: c.deleted === true,
        perms: Int32Array.from(idxs).sort(),
        source: c.source,
      });
    }

    this.classTable = buildClassTable(this.permissions);

    // CSR inverted index.
    const counts = new Int32Array(this.permissions.length + 1);
    for (const r of this.roles) for (let i = 0; i < r.perms.length; i++) counts[r.perms[i] + 1]++;
    for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
    this.offsets = counts;
    this.data = new Int32Array(counts[counts.length - 1]);
    const cursor = counts.slice(0, -1);
    for (const r of this.roles) {
      for (let i = 0; i < r.perms.length; i++) this.data[cursor[r.perms[i]]++] = r.idx;
    }

    const order = Array.from(this.roles, (r) => r.idx);
    order.sort(
      (a, b) =>
        this.roles[a].perms.length - this.roles[b].perms.length ||
        (this.roles[a].name < this.roles[b].name ? -1 : 1),
    );
    this.rolesBySize = Int32Array.from(order);
  }

  private addRole(r: Omit<RoleRecord, 'idx'>): void {
    const rec: RoleRecord = { idx: this.roles.length, ...r };
    this.roleIndex.set(rec.name, rec.idx);
    this.roles.push(rec);
  }

  // ---- lookup ----

  /** Role by full name (`roles/viewer`, `projects/p/roles/x`). */
  role(name: string): RoleRecord | undefined {
    const i = this.roleIndex.get(name);
    return i === undefined ? undefined : this.roles[i];
  }

  /** Like `role`, but also accepts a short id (`storage.objectViewer`) for predefined roles. */
  findRole(idOrShort: string): RoleRecord | undefined {
    return this.role(idOrShort) ?? this.role(`roles/${idOrShort}`);
  }

  permissionIndex(permission: string): number | undefined {
    return this.permIndex.get(permission);
  }

  hasPermission(permission: string): boolean {
    return this.permIndex.has(permission);
  }

  /** Indices of permissions matching an exact name or a `prefix.*` wildcard. */
  matchPermissions(pattern: string): number[] {
    if (!pattern.endsWith('*')) {
      const i = this.permIndex.get(pattern);
      return i === undefined ? [] : [i];
    }
    const prefix = pattern.slice(0, -1);
    const out: number[] = [];
    for (let i = 0; i < this.permissions.length; i++) if (this.permissions[i].startsWith(prefix)) out.push(i);
    return out;
  }

  /** Role indices that grant a permission (zero-copy view; do not mutate). */
  roleIdxsGranting(perm: number | string): Int32Array {
    const i = typeof perm === 'number' ? perm : this.permIndex.get(perm);
    if (i === undefined || i < 0 || i >= this.permissions.length) return new Int32Array(0);
    return this.data.subarray(this.offsets[i], this.offsets[i + 1]);
  }

  roleGrants(role: RoleRecord, permIdx: number): boolean {
    let lo = 0;
    let hi = role.perms.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = role.perms[mid];
      if (v === permIdx) return true;
      if (v < permIdx) lo = mid + 1;
      else hi = mid - 1;
    }
    return false;
  }

  classOf(permIdx: number): PrivilegeClass {
    return (['read', 'write', 'admin'] as const)[this.classTable[permIdx]];
  }

  /** Highest privilege class (0 read, 1 write, 2 admin) among a role's permissions; computed once for all roles, lazily. */
  roleMaxClass(role: RoleRecord): number {
    if (!this.roleMaxClasses) {
      const out = new Uint8Array(this.roles.length);
      for (const r of this.roles) {
        let m = 0;
        for (let i = 0; i < r.perms.length && m < 2; i++) {
          const c = this.classTable[r.perms[i]];
          if (c > m) m = c;
        }
        out[r.idx] = m;
      }
      this.roleMaxClasses = out;
    }
    return this.roleMaxClasses[role.idx];
  }

  /** Read/write/admin counts for a role. */
  profile(role: RoleRecord): PrivilegeProfile {
    return roleProfile(role.perms, this.classTable);
  }

  /** Permissions of a role grouped by service (`storage`, `compute`, ...), services alphabetical. */
  permissionsByService(role: RoleRecord): ServiceGroup[] {
    const groups = new Map<string, number[]>();
    for (let i = 0; i < role.perms.length; i++) {
      const idx = role.perms[i];
      const svc = permissionService(this.permissions[idx]);
      const arr = groups.get(svc);
      if (arr) arr.push(idx);
      else groups.set(svc, [idx]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([service, indices]) => ({
        service,
        indices,
        permissions: indices.map((i) => this.permissions[i]),
        profile: roleProfile(indices, this.classTable),
      }));
  }

  // ---- search ----

  /** Role search under construction; `ensureRoleSearch` finishes it synchronously if a query arrives. */
  private roleBuild?: SearchBuild<RoleSearchDoc>;
  private permBuild?: SearchBuild<PermSearchDoc>;

  private startRoleBuild(): SearchBuild<RoleSearchDoc> {
    return (this.roleBuild ??= {
      ms: new MiniSearch<RoleSearchDoc>({
        fields: [...NUMBER_FIELDS],
        storeFields: [],
        tokenize,
        searchOptions: { boost: { title: 3, name: 2, description: 1 }, prefix: true, combineWith: 'AND' },
      }),
      docs: this.roles.map((r) => ({ id: r.idx, name: r.name, title: r.title, description: r.description })),
      next: 0,
    });
  }

  private startPermBuild(): SearchBuild<PermSearchDoc> {
    return (this.permBuild ??= {
      ms: new MiniSearch<PermSearchDoc>({
        fields: ['text'],
        storeFields: [],
        tokenize,
        searchOptions: { prefix: true, combineWith: 'AND' },
      }),
      docs: this.permissions.map((p, i) => ({ id: i, text: p })),
      next: 0,
    });
  }

  private ensureRoleSearch() {
    if (this.roleSearch) return this.roleSearch;
    const b = this.startRoleBuild();
    advance(b, Infinity);
    return (this.roleSearch = b.ms);
  }

  private ensurePermSearch() {
    if (this.permSearch) return this.permSearch;
    const b = this.startPermBuild();
    advance(b, Infinity);
    return (this.permSearch = b.ms);
  }

  /**
   * Builds the search indexes in ~5 ms slices that yield to the event loop, so typing right after first
   * paint is never blocked by one long build. A `search` that arrives mid-build finishes the remainder
   * synchronously (only the part not yet built).
   */
  async warmSearchIdle(sliceMs = 5): Promise<void> {
    while (!this.roleSearch) {
      const b = this.startRoleBuild();
      if (advance(b, sliceMs)) this.roleSearch ??= b.ms;
      else await yieldToEventLoop();
    }
    while (!this.permSearch) {
      const b = this.startPermBuild();
      if (advance(b, sliceMs)) this.permSearch ??= b.ms;
      else await yieldToEventLoop();
    }
    // One throwaway query so the first real keystroke doesn't pay for cold code paths.
    await yieldToEventLoop();
    this.search('storage.objects', { limit: 1000 });
  }

  /** Builds the search indexes now, in one go (otherwise they are built on the first `search`). */
  warmSearch(): void {
    this.ensureRoleSearch();
    this.ensurePermSearch();
  }

  search(query: string, opts: SearchOptions = {}): SearchResult {
    const limit = opts.limit ?? 20;
    const q = query.trim();
    if (!q) return { roles: [], permissions: [] };
    return { roles: this.searchRoles(q, limit), permissions: this.searchPermissions(q, limit) };
  }

  searchRoles(q: string, limit = 20): RoleHit[] {
    const ms = this.ensureRoleSearch();
    const lower = q.toLowerCase();
    const scored = new Map<number, number>();
    for (const r of ms.search(q)) scored.set(r.id as number, r.score);
    if (scored.size === 0 && q.length >= 4) {
      for (const r of ms.search(q, { fuzzy: 0.2, combineWith: 'AND' }))
        scored.set(r.id as number, r.score * 0.5);
    }
    const exact = this.role(q) ?? this.role(`roles/${q}`);
    const queryTokens = new Set(tokenize(q));
    const hits: RoleHit[] = [];
    for (const [id, base] of scored) {
      const role = this.roles[id];
      let score = base * (role.deleted ? 0.3 : (STAGE_FACTOR[role.stage] ?? 0.9));
      const nm = role.name.toLowerCase();
      if (nm === lower || nm === `roles/${lower}`) score += 1000;
      else if (nm.endsWith(`.${lower}`) || nm.endsWith(`/${lower}`)) score += 20;
      // `storage` -> roles of the storage service (`roles/storage.*`) beat `roles/compute.storageAdmin`.
      if (queryTokens.has(roleServiceSegment(nm))) score += SERVICE_MATCH_BOOST;
      hits.push({ role, score });
    }
    if (exact && !scored.has(exact.idx)) hits.push({ role: exact, score: 1000 });
    hits.sort((a, b) => b.score - a.score || a.role.perms.length - b.role.perms.length);
    return hits.slice(0, limit);
  }

  searchPermissions(q: string, limit = 20): PermissionHit[] {
    const lower = q.toLowerCase();
    const ms = this.ensurePermSearch();
    const hits: PermissionHit[] = [];
    for (const r of ms.search(q)) {
      const i = r.id as number;
      const p = this.permissions[i];
      const pl = p.toLowerCase();
      let score = r.score;
      if (pl === lower) score += 1000;
      else if (pl.endsWith(`.${lower}`)) score += 50;
      else if (pl.startsWith(lower)) score += 30;
      else if (pl.includes(lower)) score += 10;
      hits.push({ index: i, permission: p, score });
    }
    hits.sort((a, b) => b.score - a.score || a.permission.length - b.permission.length);
    return hits.slice(0, limit);
  }

  /** Total number of (role, permission) pairs. */
  get edgeCount(): number {
    return this.data.length;
  }

  /** Verb of a permission by index. */
  verbOf(permIdx: number): string {
    return permissionVerb(this.permissions[permIdx]);
  }
}
