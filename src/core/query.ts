/** Classifies raw search-box input. */

export type ParsedQuery =
  | { kind: 'role'; id: string }
  | { kind: 'permission'; permission: string; partial: boolean }
  | { kind: 'multi'; perms: string[] }
  | { kind: 'text'; text: string };

const ROLE_RE =
  /^(?:roles\/[A-Za-z0-9_.-]+|(?:projects|organizations)\/[A-Za-z0-9_.:-]+\/roles\/[A-Za-z0-9_.-]+)$/;
/** `service.resource.verb`; also `host.tld/resource.verb` for third-party services. Last segment may be `*`. */
const PERM_RE = /^[a-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*(?:\/[A-Za-z0-9_-]+)?\.(?:[A-Za-z0-9_-]+|\*)$/;

function clean(token: string): string {
  return token.replace(/^[\s"'`([{<]+|[\s"'`)\]}>.:;,]+$/g, '');
}

export function isRoleId(s: string): boolean {
  return ROLE_RE.test(s);
}

/** True for `a.b.c`-shaped strings with at least 3 segments (or a `host/` form). */
export function looksLikePermission(s: string): boolean {
  return PERM_RE.test(s) && (s.includes('/') || s.split('.').length >= 3);
}

/**
 * - `roles/x`, `projects/p/roles/x`, `organizations/o/roles/x` -> role
 * - a single `a.b.c` -> permission (`partial` when it has fewer than 3 segments or ends in `*`, e.g. `objects.get`)
 * - 2+ whitespace/comma/semicolon/newline-separated permissions -> multi (deduplicated, in order)
 * - anything else -> text
 */
export function classifyQuery(input: string): ParsedQuery {
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'text', text: '' };
  const tokens = trimmed
    .split(/[\s,;]+/)
    .map(clean)
    .filter(Boolean);
  if (tokens.length === 1) {
    const t = tokens[0];
    if (ROLE_RE.test(t)) return { kind: 'role', id: t };
    if (PERM_RE.test(t) && !t.includes(' ')) {
      const segs = t.split('.').length;
      return { kind: 'permission', permission: t, partial: segs < 3 || t.endsWith('*') };
    }
    return { kind: 'text', text: trimmed };
  }
  if (tokens.length >= 2 && tokens.every((t) => looksLikePermission(t) && !t.endsWith('*'))) {
    return { kind: 'multi', perms: [...new Set(tokens)] };
  }
  return { kind: 'text', text: trimmed };
}
