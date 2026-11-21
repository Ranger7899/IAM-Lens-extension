import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref, type Route } from './router';

describe('compare route params', () => {
  it('parses a and b', () => {
    expect(parseRoute('#/compare?a=roles%2Fviewer&b=roles%2Feditor')).toEqual({
      name: 'compare',
      a: 'roles/viewer',
      b: 'roles/editor',
    });
    expect(parseRoute('#/compare?a=roles%2Fviewer')).toEqual({ name: 'compare', a: 'roles/viewer' });
    expect(parseRoute('#/compare')).toEqual({ name: 'compare' });
  });

  it('formats a and b', () => {
    expect(routeHref({ name: 'compare' })).toBe('#/compare');
    expect(routeHref({ name: 'compare', a: 'roles/viewer' })).toBe('#/compare?a=roles%2Fviewer');
    expect(routeHref({ name: 'compare', a: 'roles/viewer', b: 'roles/editor' })).toBe(
      '#/compare?a=roles%2Fviewer&b=roles%2Feditor',
    );
  });

  it('round-trips every route', () => {
    const routes: Route[] = [
      { name: 'search', query: 'storage admin' },
      { name: 'role', id: 'roles/viewer' },
      { name: 'permission', id: 'storage.objects.get' },
      { name: 'minimal', perms: ['a.b.c', 'd.e.f'] },
      { name: 'compare', a: 'roles/x', b: 'roles/y' },
      { name: 'whatsnew' },
    ];
    for (const r of routes) expect(parseRoute(routeHref(r))).toEqual(r);
  });
});
