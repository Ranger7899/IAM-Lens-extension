import { isDiscouraged, isLegacyRole, isServiceAgentRole, rolesGranting, type IamIndex, type RoleRecord } from '@/core';

export type Resolved =
  | { kind: 'exact'; index: number; permission: string }
  | { kind: 'picker'; matches: number[]; truncated: boolean }
  | { kind: 'none' };

export const PICKER_LIMIT = 80;

/** Exact name -> detail; `prefix.*` or partial input (`objects.get`) -> picker; nothing found -> none. */
export function resolvePermission(index: IamIndex, input: string): Resolved {
  const q = input.trim();
  if (!q) return { kind: 'none' };
  const hit = index.matchPermissions(q);
  if (!q.endsWith('*') && hit.length === 1) return { kind: 'exact', index: hit[0], permission: q };
  let matches = hit;
  if (matches.length === 0) {
    // Partial: a dotted fragment anywhere on a segment boundary, else ranked search.
    const frag = q.toLowerCase();
    const found: number[] = [];
    for (let i = 0; i < index.permissions.length; i++) {
      const p = index.permissions[i].toLowerCase();
      if (p === frag || p.endsWith(`.${frag}`) || p.includes(`.${frag}.`) || p.startsWith(`${frag}.`))
        found.push(i);
    }
    matches = found.length ? found : index.searchPermissions(q, PICKER_LIMIT).map((h) => h.index);
  }
  if (matches.length === 0) return { kind: 'none' };
  return {
    kind: 'picker',
    matches: matches.slice(0, PICKER_LIMIT),
    truncated: matches.length > PICKER_LIMIT,
  };
}

/** Roles that are hidden by the "hide deprecated, deleted and service-agent roles" toggle. */
export function isHiddenByDefault(r: RoleRecord): boolean {
  return isDiscouraged(r) || isServiceAgentRole(r);
}

/**
 * Roles granting `perm` (same service first, or strictly smallest first), plus the one that gets the Least-privilege badge: the first role
 * that is neither deprecated/deleted nor a service agent (those are never a sensible suggestion for a person).
 */
export function grantingRoles(index: IamIndex, perm: number, preferService = true) {
  const all = rolesGranting(index, perm, { preferService });
  const eligible = all.filter((r) => !isHiddenByDefault(r));
  const best = eligible.find((r) => !isLegacyRole(r)) ?? eligible[0];
  return { all, leastPrivilegeName: best?.name };
}
