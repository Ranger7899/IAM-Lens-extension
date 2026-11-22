/** "Which roles grant this?" and "what is the smallest set of roles covering these permissions?" */
import type { IamIndex, RoleRecord } from './model';
import { permissionService } from './privilege';

const STAGE_RANK: Record<string, number> = { GA: 0, BETA: 1, ALPHA: 2, DEPRECATED: 4 };

function stageRank(r: RoleRecord): number {
  return r.deleted ? 5 : (STAGE_RANK[r.stage] ?? 3);
}

/** True for roles that should only be suggested when nothing else works. */
export function isDiscouraged(r: RoleRecord): boolean {
  return r.deleted || r.stage === 'DEPRECATED';
}

/**
 * Roles meant for Google-managed or machine identities (service agents, workers, generator/collector services)
 * rather than people. They are often the numerically smallest role granting a permission, so they are demoted:
 * hidden by default on the permission screen and used by `minimalRoles` only as a fallback.
 */
export function isServiceAgentRole(r: RoleRecord): boolean {
  const n = r.name.toLowerCase();
  return (
    n.includes('serviceagent') ||
    n.includes('serviceoutput') ||
    n.endsWith('agent') ||
    n.endsWith('.worker') ||
    /service agent|generator service|service$/i.test(r.title)
  );
}

/**
 * Legacy roles (`roles/storage.legacyObjectReader`, the "(Legacy)" basic roles) still work but Google steers
 * people to their replacements, so they never get the Least-privilege badge when a non-legacy role exists.
 */
export function isLegacyRole(r: RoleRecord): boolean {
  return /\.legacy/i.test(r.name) || /\blegacy\b/i.test(r.title);
}

/** 0 = ordinary role, 1 = service-agent-like, 2 = deleted/DEPRECATED. */
function discouragedClass(r: RoleRecord): number {
  return isDiscouraged(r) ? 2 : isServiceAgentRole(r) ? 1 : 0;
}

/** `roles/storage.objectViewer` -> `storage`; undefined for `roles/viewer` and custom roles. */
export function roleService(r: RoleRecord): string | undefined {
  if (!r.name.startsWith('roles/')) return undefined;
  const rest = r.name.slice(6);
  const dot = rest.indexOf('.');
  return dot < 0 ? undefined : rest.slice(0, dot).toLowerCase();
}

/** Strict smallest-first: fewer permissions, then GA before BETA/ALPHA, then name. */
function bySizeThenStage(a: RoleRecord, b: RoleRecord): number {
  return (
    a.perms.length - b.perms.length ||
    stageRank(a) - stageRank(b) ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  );
}

/** Within a tier: GA before BETA/ALPHA, then fewer permissions, then name. */
function byStageThenSize(a: RoleRecord, b: RoleRecord): number {
  return (
    stageRank(a) - stageRank(b) ||
    a.perms.length - b.perms.length ||
    (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  );
}

export interface RolesGrantingOptions {
  /** Drop deleted and DEPRECATED roles (default false: they sort last). */
  excludeDiscouraged?: boolean;
  /** Put roles of the permission's own service (`roles/<service>.*`) first (default true). */
  preferService?: boolean;
}

/**
 * Every role granting `perm`. Ordering, most significant first: ordinary roles, then service-agent-like roles,
 * then deleted/DEPRECATED; then excess privilege (roles whose highest privilege class, read < write < admin,
 * is at most the permission's own class before roles that carry more, so a read permission never ranks an admin
 * role ahead of a read-only one); with `preferService` (default) roles of the permission's own service before the rest;
 * then GA before BETA/ALPHA; then fewest permissions; then name. With `preferService: false` the order is
 * strictly smallest first (then stage, name) within each class.
 */
export function rolesGranting(
  index: IamIndex,
  perm: string | number,
  opts: RolesGrantingOptions = {},
): RoleRecord[] {
  const preferService = opts.preferService ?? true;
  const idxs = index.roleIdxsGranting(perm);
  const name = typeof perm === 'number' ? index.permissions[perm] : perm;
  const service = preferService && name ? permissionService(name).toLowerCase() : undefined;
  const targetClass =
    typeof perm === 'number' ? index.classTable[perm] : index.classTable[index.permissionIndex(perm) ?? -1];
  const out: { r: RoleRecord; cls: number; excess: number; tier: number }[] = [];
  for (const i of idxs) {
    const r = index.roles[i];
    if (opts.excludeDiscouraged && isDiscouraged(r)) continue;
    out.push({
      r,
      cls: discouragedClass(r),
      excess: targetClass === undefined || index.roleMaxClass(r) <= targetClass ? 0 : 1,
      tier: service !== undefined && roleService(r) === service ? 0 : 1,
    });
  }
  const within = preferService ? byStageThenSize : bySizeThenStage;
  return out
    .sort((a, b) => a.cls - b.cls || a.excess - b.excess || a.tier - b.tier || within(a.r, b.r))
    .map((x) => x.r);
}

/**
 * Fixed cost added to a role's size when scoring, modelling the cost of one more binding.
 * Without it a 1-permission legacy role always beats a slightly larger role covering several targets.
 */
export const ROLE_OVERHEAD = 10;

export interface ChosenRole {
  role: RoleRecord;
  /** Requested permissions this role grants (all of them, not only those newly covered). */
  grants: string[];
  /** Requested permissions this role was the first to cover in the greedy order. */
  covers: string[];
  /** True when only a deleted/DEPRECATED role could cover something. */
  discouraged: boolean;
}

export interface MinimalRolesResult {
  /** Chosen roles in greedy order. */
  roles: ChosenRole[];
  /** For each requested known permission, the chosen roles granting it. */
  coverage: Record<string, string[]>;
  /** Requested permissions that are not in the permission table at all. */
  unknown: string[];
  /** Known permissions that no role grants. */
  uncoverable: string[];
}

/**
 * Greedy weighted set cover. At every step picks the role maximising
 * `newly covered / (permission count + ROLE_OVERHEAD)` (ties: lower highest privilege class, then GA first, fewer permissions, then name).
 * Roles of the same service as a requested permission are preferred; then any ordinary role, then
 * service-agent/worker roles, then deleted/DEPRECATED ones, each tier only for what the earlier tiers could not cover.
 * Redundant picks are pruned afterwards.
 */
export function minimalRoles(index: IamIndex, perms: readonly string[]): MinimalRolesResult {
  const requested = [...new Set(perms)];
  const unknown: string[] = [];
  const targets: number[] = [];
  for (const p of requested) {
    const i = index.permissionIndex(p);
    if (i === undefined) unknown.push(p);
    else targets.push(i);
  }

  const uncovered = new Set(targets);
  const picks: { role: RoleRecord; covers: number[]; discouraged: boolean }[] = [];

  const targetServices = new Set(targets.map((t) => permissionService(index.permissions[t])));
  // tier 0: ordinary roles of the same service as a requested permission; tier 1: any ordinary role;
  // tier 2: + service agents/workers; tier 3: + deleted/DEPRECATED. Each tier runs a GA-only pass first.
  const runPass = (tier: 0 | 1 | 2 | 3, gaOnly: boolean) => {
    // candidate role idx -> targets it grants
    const cand = new Map<number, number[]>();
    for (const t of uncovered) {
      for (const ri of index.roleIdxsGranting(t)) {
        const cr = index.roles[ri];
        if (gaOnly && cr.stage !== 'GA') continue;
        if (tier < 3 && isDiscouraged(cr)) continue;
        if (tier < 2 && isServiceAgentRole(cr)) continue;
        if (tier < 1) {
          const svc = roleService(cr);
          if (svc === undefined || !targetServices.has(svc)) continue;
        }
        const arr = cand.get(ri);
        if (arr) arr.push(t);
        else cand.set(ri, [t]);
      }
    }
    while (uncovered.size > 0 && cand.size > 0) {
      let best: RoleRecord | undefined;
      let bestNew: number[] = [];
      let bestRatio = 0;
      for (const [ri, ts] of cand) {
        const fresh = ts.filter((t) => uncovered.has(t));
        if (fresh.length === 0) continue;
        const role = index.roles[ri];
        const ratio = fresh.length / (role.perms.length + ROLE_OVERHEAD);
        if (
          !best ||
          ratio > bestRatio + 1e-12 ||
          (Math.abs(ratio - bestRatio) <= 1e-12 &&
            (index.roleMaxClass(role) < index.roleMaxClass(best) ||
              (index.roleMaxClass(role) === index.roleMaxClass(best) && byStageThenSize(role, best) < 0)))
        ) {
          best = role;
          bestNew = fresh;
          bestRatio = ratio;
        }
      }
      if (!best) break;
      picks.push({ role: best, covers: bestNew, discouraged: isDiscouraged(best) });
      for (const t of bestNew) uncovered.delete(t);
      cand.delete(best.idx);
    }
  };

  // Within a tier, GA roles are tried before BETA/ALPHA ones.
  for (const tier of [0, 1, 2, 3] as const) {
    runPass(tier, true);
    runPass(tier, false);
  }

  // Prune picks made redundant by later ones.
  for (let i = picks.length - 1; i >= 0; i--) {
    const others = picks.filter((_, j) => j !== i);
    const allCovered = targets.every(
      (t) => !picks[i].covers.includes(t) || others.some((o) => index.roleGrants(o.role, t)),
    );
    if (allCovered && picks[i].covers.length > 0) picks.splice(i, 1);
  }

  const uncoverable = [...uncovered].map((t) => index.permissions[t]);
  const chosen: ChosenRole[] = picks.map((p) => ({
    role: p.role,
    covers: p.covers.map((t) => index.permissions[t]),
    grants: targets.filter((t) => index.roleGrants(p.role, t)).map((t) => index.permissions[t]),
    discouraged: p.discouraged,
  }));
  const coverage: Record<string, string[]> = {};
  for (const t of targets) {
    const name = index.permissions[t];
    coverage[name] = picks.filter((p) => index.roleGrants(p.role, t)).map((p) => p.role.name);
  }
  return { roles: chosen, coverage, unknown, uncoverable };
}
