// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { WhatsNewScreen } from '../WhatsNewScreen';
import type { WhatsNewLoader } from './useWhatsNew';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLElement;

async function mount(load: WhatsNewLoader) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<WhatsNewScreen load={load} />));
  // Let the idle-callback / timeout diff run.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
}
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const hrefs = () => [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));
const sections = () => [...host.querySelectorAll('h3')].map((h) => h.textContent);

describe('WhatsNewScreen', () => {
  it('shows a friendly empty state without a previous snapshot', async () => {
    const current = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.b.get'] }]);
    await mount(() => Promise.resolve({ current }));
    expect(host.textContent).toContain(
      "You're on the bundled snapshot; changes appear after the first daily update".replace("'", '’'),
    );
    expect(host.querySelector('h3')).toBeNull();
  });

  it('renders every section with counts, links and stage changes', async () => {
    const previous = await makeSnapshot(
      [
        {
          name: 'roles/svc.viewer',
          title: 'Svc Viewer',
          stage: 'BETA',
          perms: ['svc.things.get', 'svc.things.list', 'svc.old.get'],
        },
        { name: 'roles/svc.legacy', title: 'Svc Legacy', perms: ['svc.legacy.get'] },
        { name: 'roles/svc.same', title: 'Same', perms: ['svc.things.get'] },
      ],
      '2026-01-01T00:00:00.000Z',
    );
    const current = await makeSnapshot(
      [
        {
          name: 'roles/svc.viewer',
          title: 'Svc Viewer',
          stage: 'GA',
          perms: ['svc.things.get', 'svc.things.list', 'svc.things.watch'],
        },
        { name: 'roles/svc.same', title: 'Same', perms: ['svc.things.get'] },
        { name: 'roles/svc.newAdmin', title: 'Svc New Admin', perms: ['svc.things.delete'] },
      ],
      '2026-02-01T00:00:00.000Z',
    );
    await mount(() => Promise.resolve({ previous, current }));

    expect(sections()).toEqual([
      expect.stringContaining('Roles added'),
      expect.stringContaining('Roles changed'),
      expect.stringContaining('Roles removed'),
      expect.stringContaining('Permissions added'),
      expect.stringContaining('Permissions removed'),
    ]);
    const text = host.textContent ?? '';
    expect(text).toContain('Jan 1, 2026');
    expect(text).toContain('Feb 1, 2026');
    expect(text).toContain(previous.version.slice(0, 7));
    expect(text).toContain(current.version.slice(0, 7));
    // Stage change BETA -> GA and +/- permission counts on the changed role.
    expect(text).toContain('BETA');
    expect(text).toContain('+1 permissions');
    expect(text).toContain('−1 permissions');
    // Count badges.
    expect(host.querySelectorAll('h3 span:last-child')[0].textContent).toBe('1');
    // Items of surviving things link to their detail routes; removed ones are plain text.
    const h = hrefs();
    expect(h).toContain('#/role/roles%2Fsvc.newAdmin');
    expect(h).toContain('#/role/roles%2Fsvc.viewer');
    expect(h).toContain('#/permission/svc.things.watch');
    expect(h).not.toContain('#/role/roles%2Fsvc.legacy');
    expect(text).toContain('roles/svc.legacy');
    expect(text).toContain('legacy');
  });

  it('says so when the snapshots are identical', async () => {
    const s = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.b.get'] }]);
    await mount(() => Promise.resolve({ previous: s, current: s }));
    expect(host.textContent).toContain('The two snapshots are identical');
    expect(host.querySelector('h3')).toBeNull();
  });

  it('shows an error card when loading fails', async () => {
    await mount(() => Promise.reject(new Error('boom')));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('boom');
  });
});
