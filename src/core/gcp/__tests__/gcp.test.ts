// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GcpApiError, gcpFetch } from '../http';
import { searchOrganizations, searchProjects } from '../crm';
import { listCustomRoles } from '../iam';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const getToken = vi.fn(async (o?: { forceRefresh?: boolean }) => (o?.forceRefresh ? 'fresh' : 'tok'));

afterEach(() => {
  vi.useRealTimers();
  getToken.mockClear();
});

describe('gcpFetch', () => {
  it('sends a bearer header', async () => {
    const f = vi.fn(async () => json({ ok: 1 }));
    await gcpFetch('https://x', { getToken, fetch: f as never });
    expect((f.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { Authorization: 'Bearer tok' } });
  });

  it('refreshes the token once on 401 and retries', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ ok: 1 }));
    expect(await gcpFetch('https://x', { getToken, fetch: f as never })).toEqual({ ok: 1 });
    expect(getToken).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(f.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
  });

  it('gives up after a second 401', async () => {
    const f = vi.fn(async () =>
      json({ error: { code: 401, status: 'UNAUTHENTICATED', message: 'no' } }, 401),
    );
    await expect(gcpFetch('https://x', { getToken, fetch: f as never })).rejects.toMatchObject({
      status: 401,
      reason: 'UNAUTHENTICATED',
    });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('backs off on 429 using fake timers, then succeeds', async () => {
    vi.useFakeTimers();
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 429))
      .mockResolvedValueOnce(json({}, 503))
      .mockResolvedValueOnce(json({ ok: 1 }));
    const p = gcpFetch('https://x', { getToken, fetch: f as never });
    await vi.advanceTimersByTimeAsync(500);
    expect(f).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await p).toEqual({ ok: 1 });
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('throws a typed error after 3 attempts', async () => {
    vi.useFakeTimers();
    const f = vi.fn(async () =>
      json({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'slow' } }, 429),
    );
    const p = gcpFetch('https://x', { getToken, fetch: f as never });
    const assertion = expect(p).rejects.toMatchObject({
      status: 429,
      reason: 'RESOURCE_EXHAUSTED',
      message: 'slow',
    });
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
    expect(f).toHaveBeenCalledTimes(3);
  });

  it('does not retry other 4xx and tolerates non-JSON bodies', async () => {
    const f = vi.fn(async () => new Response('boom', { status: 400 }));
    const err = (await gcpFetch('https://x', { getToken, fetch: f as never }).catch(
      (e: unknown) => e,
    )) as GcpApiError;
    expect(err).toBeInstanceOf(GcpApiError);
    expect(err.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('crm', () => {
  it('pages through projects', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        json({ projects: [{ name: 'projects/1', projectId: 'a', displayName: 'A' }], nextPageToken: 'n' }),
      )
      .mockResolvedValueOnce(json({ projects: [{ name: 'projects/2', projectId: 'b' }] }));
    const r = await searchProjects('id:a*', { getToken, fetch: f as never });
    expect(r).toEqual([
      { id: 'a', displayName: 'A', name: 'projects/1' },
      { id: 'b', displayName: 'b', name: 'projects/2' },
    ]);
    const u1 = new URL(f.mock.calls[0][0]);
    expect(u1.pathname).toBe('/v3/projects:search');
    expect(u1.searchParams.get('query')).toBe('id:a*');
    expect(new URL(f.mock.calls[1][0]).searchParams.get('pageToken')).toBe('n');
  });

  it('searches organizations', async () => {
    const f = vi.fn(async () =>
      json({ organizations: [{ name: 'organizations/123', displayName: 'acme.com' }] }),
    );
    expect(await searchOrganizations({ getToken, fetch: f as never })).toEqual([
      { id: '123', displayName: 'acme.com', name: 'organizations/123' },
    ]);
  });
});

describe('listCustomRoles', () => {
  it('pages and maps to CustomRoleInput', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          roles: [{ name: 'projects/p/roles/r1', title: 'R1', includedPermissions: ['a.b.c'], stage: 'GA' }],
          nextPageToken: 'tk',
        }),
      )
      .mockResolvedValueOnce(json({ roles: [{ name: 'projects/p/roles/r2', deleted: true }] }));
    const r = await listCustomRoles('projects/p', { getToken, fetch: f as never });
    expect(r).toEqual([
      {
        name: 'projects/p/roles/r1',
        title: 'R1',
        description: undefined,
        stage: 'GA',
        deleted: undefined,
        perms: ['a.b.c'],
        source: { kind: 'custom', parent: 'projects/p' },
      },
      {
        name: 'projects/p/roles/r2',
        title: undefined,
        description: undefined,
        stage: undefined,
        deleted: true,
        perms: [],
        source: { kind: 'custom', parent: 'projects/p' },
      },
    ]);
    const u = new URL(f.mock.calls[0][0]);
    expect(u.pathname).toBe('/v1/projects/p/roles');
    expect(u.searchParams.get('view')).toBe('FULL');
    expect(u.searchParams.get('pageSize')).toBe('1000');
    expect(u.searchParams.get('showDeleted')).toBe('false');
    expect(new URL(f.mock.calls[1][0]).searchParams.get('pageToken')).toBe('tk');
  });

  it('maps 403 to a friendly reason', async () => {
    const f = vi.fn(async () =>
      json({ error: { code: 403, status: 'PERMISSION_DENIED', message: 'denied' } }, 403),
    );
    await expect(listCustomRoles('organizations/9', { getToken, fetch: f as never })).rejects.toMatchObject({
      status: 403,
      reason: 'missing iam.roles.list on organizations/9',
    });
  });
});
