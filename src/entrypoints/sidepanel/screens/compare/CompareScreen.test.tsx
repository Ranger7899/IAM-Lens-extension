// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider } from '@/ui/data';
import { CompareScreen } from '../CompareScreen';
import { AUTO_OPEN_TOTAL } from './DiffSection';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MANY = Array.from({ length: AUTO_OPEN_TOTAL + 5 }, (_, i) => `compute.things.get${i}`);
const roles = [
  {
    name: 'roles/viewer',
    title: 'Viewer',
    perms: ['storage.objects.get', 'storage.objects.list', 'iam.roles.get'],
  },
  {
    name: 'roles/editor',
    title: 'Editor',
    perms: ['storage.objects.get', 'storage.objects.list', 'storage.objects.delete', 'pubsub.topics.create'],
  },
  { name: 'roles/huge', title: 'Huge', perms: [...MANY, 'storage.objects.get'] },
];

let root: Root;
let host: HTMLElement;
const writeText = vi.fn(() => Promise.resolve());

async function mount(hash: string) {
  location.hash = hash;
  const snapshot = await makeSnapshot(roles);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <IamProvider loader={() => Promise.resolve({ snapshot, source: 'bundled' })}>
        <IamGate>
          <CompareScreen />
        </IamGate>
      </IamProvider>,
    ),
  );
  await act(async () => {});
}
const click = (el: Element | null) => act(async () => (el as HTMLElement).click());
const section = (label: string) => host.querySelector(`section[aria-label="${label}"]`)!;
const countOf = (label: string) => section(label).querySelector('[aria-label$="permissions"]')?.textContent;

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  writeText.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  location.hash = '';
});

describe('CompareScreen', () => {
  it('prefills from the hash and shows the three-way diff with counts', async () => {
    await mount('#/compare?a=roles%2Fviewer&b=roles%2Feditor');
    expect((host.querySelector('input[aria-label="Role A"]') as HTMLInputElement).value).toBe('roles/viewer');
    expect((host.querySelector('input[aria-label="Role B"]') as HTMLInputElement).value).toBe('roles/editor');
    expect(countOf('Only in A')).toBe('1');
    expect(countOf('Only in B')).toBe('2');
    expect(countOf('Shared')).toBe('2');
    expect(section('Only in A').textContent).toContain('iam');
    expect(section('Only in B').textContent).toContain('pubsub');
    const bars = [...host.querySelectorAll('[role="img"]')].map((e) => e.getAttribute('aria-label'));
    expect(bars).toContain('3 read, 0 write, 0 admin');
  });

  it('shows two privilege bars, one per role', async () => {
    await mount('#/compare?a=roles%2Fviewer&b=roles%2Feditor');
    const labels = [...host.querySelectorAll('[role="img"]')].map((e) => e.getAttribute('aria-label') ?? '');
    expect(labels.filter((l) => /read, .* write, .* admin$/.test(l))).toHaveLength(2);
  });

  it('copies each section', async () => {
    await mount('#/compare?a=roles%2Fviewer&b=roles%2Feditor');
    await click(host.querySelector('button[aria-label="Copy only in b permissions"]'));
    expect(writeText).toHaveBeenCalledWith('pubsub.topics.create\nstorage.objects.delete');
    await click(host.querySelector('button[aria-label="Copy shared permissions"]'));
    expect(writeText).toHaveBeenLastCalledWith('storage.objects.get\nstorage.objects.list');
    expect(host.textContent).toContain('2 shared permissions copied');
  });

  it('swaps A and B through the hash', async () => {
    await mount('#/compare?a=roles%2Fviewer&b=roles%2Feditor');
    await click(host.querySelector('button[aria-label="Swap roles A and B"]'));
    await act(async () => {});
    expect(location.hash).toBe('#/compare?a=roles%2Feditor&b=roles%2Fviewer');
    expect(countOf('Only in A')).toBe('2');
  });

  it('autocompletes with searchRoles and applies the pick', async () => {
    await mount('#/compare?a=roles%2Fviewer');
    expect(host.textContent).toContain('Compare two roles');
    const input = host.querySelector('input[aria-label="Role B"]') as HTMLInputElement;
    await act(async () => input.focus());
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'edit');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const option = [...host.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent?.includes('roles/editor'),
    );
    expect(option).toBeTruthy();
    await click(option!);
    await act(async () => {});
    expect(location.hash).toBe('#/compare?a=roles%2Fviewer&b=roles%2Feditor');
    expect(countOf('Only in B')).toBe('2');
  });

  it('collapses service groups of a large section and expands on demand', async () => {
    await mount('#/compare?a=roles%2Fviewer&b=roles%2Fhuge');
    const sec = section('Only in B');
    const toggle = [...sec.querySelectorAll('h3 button')].find((b) => b.textContent?.includes('compute'))!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sec.querySelectorAll('li').length).toBe(0);
    await click(toggle);
    expect(sec.querySelectorAll('ul li').length).toBeGreaterThan(0);
  });

  it('flags an unknown role', async () => {
    await mount('#/compare?a=roles%2Fnope&b=roles%2Feditor');
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('roles/nope');
    expect(host.textContent).toContain('Compare two roles');
  });
});
