// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot, type TinyRole } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider } from '@/ui/data';
import { PermissionScreen } from '../PermissionScreen';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROLES: TinyRole[] = [
  // Smallest, but deprecated: must NOT get the badge.
  {
    name: 'roles/storage.legacyObjectReader',
    title: 'Legacy Object Reader',
    stage: 'DEPRECATED',
    perms: ['storage.objects.get'],
  },
  // Service agent: also skipped.
  { name: 'roles/foo.serviceAgent', title: 'Foo Service Agent', perms: ['storage.objects.get', 'foo.a.get'] },
  {
    name: 'roles/storage.objectViewer',
    title: 'Storage Object Viewer',
    perms: ['storage.objects.get', 'storage.objects.list'],
  },
  {
    name: 'roles/storage.objectAdmin',
    title: 'Storage Object Admin',
    perms: ['storage.objects.get', 'storage.objects.list', 'storage.objects.delete'],
  },
  {
    name: 'roles/storage.gone',
    title: 'Gone Role',
    deleted: true,
    perms: [
      'storage.objects.get',
      'storage.objects.list',
      'storage.objects.delete',
      'storage.objects.create',
    ],
  },
  {
    name: 'roles/iam.serviceAccountUser',
    title: 'Service Account User',
    perms: ['iam.serviceAccounts.actAs'],
  },
];

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  location.hash = '';
});

async function mount(name: string) {
  const snapshot = await makeSnapshot(ROLES);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <IamProvider loader={async () => ({ snapshot, source: 'bundled' as const })}>
        <IamGate>
          <PermissionScreen name={name} />
        </IamGate>
      </IamProvider>,
    ),
  );
  return host;
}

const rowTitles = (h: HTMLElement) =>
  [...h.querySelectorAll('ul[aria-label="Roles granting this permission"] li')].map(
    (li) => li.textContent ?? '',
  );

describe('PermissionScreen', () => {
  it('lists roles smallest first with the badge on the first non-discouraged, non-agent role', async () => {
    const h = await mount('storage.objects.get');
    expect(h.textContent).toContain('Granted by 5 roles');
    const rows = rowTitles(h);
    expect(rows).toHaveLength(2); // deprecated, deleted and agent roles hidden by default
    expect(rows[0]).toContain('Storage Object Viewer');
    expect(rows[0]).toContain('roles/storage.objectViewer');
    expect(rows[0]).toContain('Least privilege');
    expect(rows[1]).toContain('Storage Object Admin');
    expect(rows[1]).not.toContain('Least privilege');
    expect(h.textContent!.match(/Least privilege/g)).toHaveLength(1);
    expect(h.querySelector('[aria-label*="read"]')).not.toBeNull(); // PrivilegeBar
  });

  it('shows every role, still badging the right one, when the toggle is off', async () => {
    const h = await mount('storage.objects.get');
    const toggle = [...h.querySelectorAll('button')].find((b) => b.textContent?.includes('Hide deprecated'))!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await act(async () => toggle.click());
    const rows = rowTitles(h);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toContain('Storage Object Viewer'); // deprecated, deleted and agent roles sort last
    expect(rows[4]).toContain('Gone Role');
    expect(rows.filter((r) => r.includes('Legacy Object Reader'))).toHaveLength(1);
    expect(rows.findIndex((r) => r.includes('Least privilege'))).toBe(
      rows.findIndex((r) => r.includes('Object Viewer')),
    );
  });

  it('has an Order toggle (Same service first by default) that switches to Smallest overall', async () => {
    const h = await mount('storage.objects.get');
    const group = h.querySelector('[role="radiogroup"][aria-label="Order"]')!;
    const [svc, size] = [...group.querySelectorAll('button[role="radio"]')] as HTMLButtonElement[];
    expect(svc.textContent).toContain('Same service first');
    expect(svc.getAttribute('aria-checked')).toBe('true');
    await act(async () => size.click());
    expect(size.getAttribute('aria-checked')).toBe('true');
    expect(rowTitles(h)[0]).toContain('Storage Object Viewer');
  });

  it('opens role/:name when a role is clicked', async () => {
    const h = await mount('storage.objects.get');
    const btn = h.querySelector(
      'ul[aria-label="Roles granting this permission"] li button',
    ) as HTMLButtonElement;
    await act(async () => btn.click());
    expect(location.hash).toBe('#/role/roles%2Fstorage.objectViewer');
  });

  it('copies the permission', async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t: string) => void writes.push(t) },
      configurable: true,
    });
    const h = await mount('storage.objects.get');
    const btn = h.querySelector('button[aria-label="Copy storage.objects.get"]') as HTMLButtonElement;
    await act(async () => btn.click());
    expect(writes).toEqual(['storage.objects.get']);
    expect(h.textContent).toContain('Copied storage.objects.get');
  });

  it('resolves partial input and wildcards to a picker', async () => {
    for (const q of ['objects.get', 'storage.objects.*']) {
      const h = await mount(q);
      const items = h.querySelectorAll('ul[aria-label="Matching permissions"] li');
      expect(items.length).toBeGreaterThan(0);
      expect(h.textContent).toContain('Which permission?');
      act(() => root?.unmount());
      h.remove();
    }
    const h = await mount('storage.objects.*');
    expect(h.querySelectorAll('ul[aria-label="Matching permissions"] li')).toHaveLength(4);
    const first = h.querySelector('ul[aria-label="Matching permissions"] li button') as HTMLButtonElement;
    await act(async () => first.click());
    expect(location.hash).toMatch(/^#\/permission\/storage\.objects\./);
  });

  it('shows an empty state for unknown permissions', async () => {
    const h = await mount('nope.nothing.get');
    expect(h.textContent).toContain('No such permission');
  });
});
