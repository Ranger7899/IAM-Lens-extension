// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider } from '@/ui/data';
import { RoleScreen } from '../RoleScreen';
import { docsUrl, gcloudDescribe } from './roleLinks';
import { PAGE } from './ServiceSection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BIG = [
  ...Array.from({ length: PAGE * 2 + 30 }, (_, i) => `compute.things.get${i}`),
  'storage.objects.get',
];
const roles = [
  {
    name: 'roles/storage.objectViewer',
    title: 'Storage Object Viewer',
    description: 'Read objects.',
    perms: [
      'storage.objects.get',
      'storage.objects.list',
      'storage.objects.create',
      'resourcemanager.projects.get',
      'iam.serviceAccounts.actAs',
    ],
  },
  { name: 'roles/huge', title: 'Huge', perms: BIG },
];

let root: Root;
let host: HTMLElement;
const writeText = vi.fn(() => Promise.resolve());

async function mount(name: string) {
  const snapshot = await makeSnapshot(roles);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <IamProvider loader={() => Promise.resolve({ snapshot, source: 'bundled' })}>
        <IamGate>
          <RoleScreen name={name} />
        </IamGate>
      </IamProvider>,
    ),
  );
  await act(async () => {});
}

const click = (el: Element | null) => act(async () => (el as HTMLElement).click());
const byText = (sel: string, text: string) =>
  [...host.querySelectorAll(sel)].find((e) => e.textContent?.includes(text)) ?? null;

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  location.hash = '';
  writeText.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('RoleScreen', () => {
  it('shows the header with spectrum counts and groups permissions by service', async () => {
    await mount('roles/storage.objectViewer');
    expect(host.querySelector('h2')?.textContent).toBe('Storage Object Viewer');
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('3 read, 1 write, 1 admin');
    const services = [...host.querySelectorAll('section h3 button')].map((b) => b.textContent);
    expect(services).toHaveLength(3);
    expect(services[0]).toContain('iam');
    expect(services[2]).toContain('storage');
  });

  it('accepts a short id', async () => {
    await mount('storage.objectViewer');
    expect(host.querySelector('h2')?.textContent).toBe('Storage Object Viewer');
  });

  it('filters by text and by risk, and clears', async () => {
    await mount('roles/storage.objectViewer');
    const input = host.querySelector('input[type="search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'objects.l');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.textContent).toContain('1 of 5 permissions');
    await click(byText('button[aria-pressed]', 'Admin'));
    expect(host.textContent).toContain('No permissions match');
    await click(byText('button', 'Clear filters'));
    expect(host.querySelectorAll('li button[aria-label$="permission"]')).toHaveLength(5);
  });

  it('collapses a service', async () => {
    await mount('roles/storage.objectViewer');
    const toggle = byText('h3 button', 'storage')!;
    expect(host.querySelectorAll('li button[aria-label^="storage."]')).toHaveLength(3);
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelectorAll('li button[aria-label^="storage."]')).toHaveLength(0);
  });

  it('copies with a snackbar: permissions, gcloud command, role ID', async () => {
    await mount('roles/storage.objectViewer');
    await click(host.querySelector('button[aria-label="Copy all permissions"]'));
    expect(writeText).toHaveBeenLastCalledWith(
      'iam.serviceAccounts.actAs\nresourcemanager.projects.get\nstorage.objects.create\nstorage.objects.get\nstorage.objects.list',
    );
    expect(host.querySelector('[role="status"][aria-live]')?.textContent).toContain('permissions copied');
    await click(host.querySelector('button[aria-label^="Copy gcloud"]'));
    expect(writeText).toHaveBeenLastCalledWith('gcloud iam roles describe roles/storage.objectViewer');
    await click(host.querySelector('button[aria-label^="Copy role ID"]'));
    expect(writeText).toHaveBeenLastCalledWith('roles/storage.objectViewer');
    expect(host.textContent).toContain('Role ID copied');
  });

  it('navigates to a permission, to compare, and builds docs URLs', async () => {
    await mount('roles/storage.objectViewer');
    await click(host.querySelector('li button[aria-label="storage.objects.get, read permission"]'));
    expect(location.hash).toBe('#/permission/storage.objects.get');
    await click(byText('button', 'Compare'));
    expect(location.hash).toBe(`#/compare?a=${encodeURIComponent('roles/storage.objectViewer')}`);
    expect(docsUrl({ name: 'roles/storage.objectViewer', source: { kind: 'predefined' } })).toBe(
      'https://cloud.google.com/iam/docs/roles-permissions/storage#storage.objectViewer',
    );
    expect(docsUrl({ name: 'projects/p/roles/x', source: { kind: 'custom', parent: 'p' } })).toBe(
      'https://cloud.google.com/iam/docs/roles-permissions',
    );
    expect(gcloudDescribe({ name: 'roles/viewer' })).toBe('gcloud iam roles describe roles/viewer');
  });

  it('caps rows per expanded service and pages with Show more', async () => {
    await mount('roles/huge');
    const rows = () => host.querySelectorAll('li button[aria-label$="permission"]').length;
    expect(rows()).toBe(0); // large role starts collapsed
    await click(byText('h3 button', 'compute'));
    expect(rows()).toBe(PAGE);
    await click(byText('button', 'Show 100 more'));
    expect(rows()).toBe(PAGE * 2);
  });

  it('shows a not-found state with a search suggestion', async () => {
    await mount('roles/storage.nope');
    expect(host.textContent).toContain('Role not found');
    await click(byText('button', 'Search for'));
    expect(location.hash).toBe('#/search?q=storage%20nope');
  });
});
