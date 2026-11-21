import type { IamIndex, PrivilegeProfile } from '@/core';
import { classifyQuery } from '@/core';
import type { Route } from '@/entrypoints/sidepanel/routes';

export const LIMIT = 8;

export type PopupResult =
  | { kind: 'role'; id: string; title: string; counts: PrivilegeProfile; stage: string }
  | { kind: 'permission'; id: string; risk: 'read' | 'write' | 'admin'; grantedBy: number };

export const routeOf = (r: PopupResult): Route =>
  r.kind === 'role' ? { name: 'role', id: r.id } : { name: 'permission', id: r.id };

/**
 * Top results across roles and permissions. The kind the query looks like leads (permission-shaped text
 * leads with permissions, anything else with roles) but the other kind always gets a share when it has hits.
 */
export function topResults(index: IamIndex, query: string, limit = LIMIT): PopupResult[] {
  const q = query.trim();
  if (!q) return [];
  const parsed = classifyQuery(q);
  if (parsed.kind === 'multi') return [];
  const { roles, permissions } = index.search(q, { limit });
  const rs: PopupResult[] = roles.map((h) => ({
    kind: 'role',
    id: h.role.name,
    title: h.role.title || h.role.name,
    counts: index.profile(h.role),
    stage: h.role.deleted ? 'DEPRECATED' : h.role.stage,
  }));
  const ps: PopupResult[] = permissions.map((h) => ({
    kind: 'permission',
    id: h.permission,
    risk: index.classOf(h.index),
    grantedBy: index.roleIdxsGranting(h.index).length,
  }));
  const [lead, rest] = parsed.kind === 'permission' ? [ps, rs] : [rs, ps];
  const take = Math.min(lead.length, Math.max(limit - Math.min(rest.length, 3), Math.ceil(limit / 2)));
  const out = [...lead.slice(0, take), ...rest.slice(0, limit - take)];
  return [...out, ...lead.slice(take, take + limit - out.length)];
}
