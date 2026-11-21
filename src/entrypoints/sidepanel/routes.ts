/** Hash routes (`#/role/roles%2Fstorage.admin`): the Route type and its parse/format pair. */
export type Route =
  | { name: 'search'; query: string }
  | { name: 'role'; id: string }
  | { name: 'permission'; id: string }
  | { name: 'minimal'; perms?: string[] }
  | { name: 'compare'; a?: string; b?: string }
  | { name: 'whatsnew' };

export type TopLevelRoute = 'search' | 'minimal' | 'compare' | 'whatsnew';

export function parseRoute(hash: string): Route {
  const [path = '', qs = ''] = hash.replace(/^#\/?/, '').split('?');
  const [head = '', ...rest] = path.split('/');
  const arg = rest.length ? decodeURIComponent(rest.join('/')) : '';
  switch (head) {
    case 'role':
      if (arg) return { name: 'role', id: arg };
      break;
    case 'permission':
      if (arg) return { name: 'permission', id: arg };
      break;
    case 'minimal': {
      const perms = (new URLSearchParams(qs).get('perms') ?? '').split(',').filter(Boolean);
      return perms.length ? { name: 'minimal', perms } : { name: 'minimal' };
    }
    case 'compare': {
      const q = new URLSearchParams(qs);
      const a = q.get('a') || undefined;
      const b = q.get('b') || undefined;
      return { name: 'compare', ...(a ? { a } : {}), ...(b ? { b } : {}) };
    }
    case 'whatsnew':
      return { name: head };
  }
  return { name: 'search', query: new URLSearchParams(qs).get('q') ?? '' };
}

export function routeHref(r: Route): string {
  switch (r.name) {
    case 'search':
      return r.query ? `#/search?q=${encodeURIComponent(r.query)}` : '#/search';
    case 'role':
      return `#/role/${encodeURIComponent(r.id)}`;
    case 'permission':
      return `#/permission/${encodeURIComponent(r.id)}`;
    case 'minimal':
      return r.perms?.length ? `#/minimal?perms=${encodeURIComponent(r.perms.join(','))}` : '#/minimal';
    case 'compare': {
      const q = new URLSearchParams();
      if (r.a) q.set('a', r.a);
      if (r.b) q.set('b', r.b);
      const s = q.toString();
      return s ? `#/compare?${s}` : '#/compare';
    }
    default:
      return `#/${r.name}`;
  }
}
