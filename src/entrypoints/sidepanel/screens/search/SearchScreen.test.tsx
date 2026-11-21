// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider } from '@/ui/data';
import { SearchScreen } from '../SearchScreen';
import type { Route } from '../../router';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  history.replaceState(null, '', '#/search');
});
beforeEach(() => vi.useRealTimers());

async function mount(query = '') {
  const snapshot = await makeSnapshot([
    {
      name: 'roles/storage.admin',
      title: 'Storage Admin',
      perms: ['storage.objects.get', 'storage.objects.delete', 'storage.buckets.list'],
    },
    { name: 'roles/storage.objectViewer', title: 'Storage Object Viewer', perms: ['storage.objects.get'] },
    { name: 'roles/run.invoker', title: 'Cloud Run Invoker', stage: 'BETA', perms: ['run.routes.invoke'] },
  ]);
  const go = vi.fn<(r: Route) => void>();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <IamProvider loader={async () => ({ snapshot, source: 'bundled' as const })}>
        <IamGate>
          <SearchScreen query={query} go={go} />
        </IamGate>
      </IamProvider>,
    ),
  );
  return go;
}

async function type(value: string) {
  const input = host!.querySelector('input')!;
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}
const key = (el: Element, k: string) =>
  act(async () => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })));
const rows = () => [...host!.querySelectorAll('ul[aria-label] li button')];
const tabs = () => [...host!.querySelectorAll('[role=tab]')].map((t) => t.textContent);

describe('SearchScreen', () => {
  it('shows example tokens when empty', async () => {
    await mount();
    expect(host!.textContent).toContain('storage.objects.get');
    expect(host!.textContent).toContain('bigquery admin');
  });

  it('shows ranked roles and permissions with counts in the tabs', async () => {
    await mount();
    await type('storage');
    expect(tabs()[0]).toMatch(/^Roles · 2$/);
    expect(tabs()[1]).toMatch(/^Permissions · 3$/);
    expect(rows().length).toBe(2);
    expect(host!.textContent).toContain('Storage Admin');
    await act(async () => (host!.querySelector('#tab-permissions') as HTMLElement).click());
    expect(rows().length).toBe(3);
  });

  it('Enter on an exact role id opens the role; exact permission opens the permission', async () => {
    const go = await mount();
    const input = await type('roles/storage.admin');
    expect(host!.textContent).toContain('Open role');
    await key(input, 'Enter');
    expect(go).toHaveBeenCalledWith({ name: 'role', id: 'roles/storage.admin' });
    await type('storage.objects.get');
    await key(host!.querySelector('input')!, 'Enter');
    expect(go).toHaveBeenLastCalledWith({ name: 'permission', id: 'storage.objects.get' });
  });

  it('offers Find minimal roles for a multi-permission paste', async () => {
    const go = await mount();
    await type('storage.objects.get run.routes.invoke');
    const card = host!.querySelector<HTMLElement>('[data-jump]')!;
    expect(card.textContent).toContain('Find minimal roles');
    await act(async () => card.click());
    expect(go).toHaveBeenCalledWith({
      name: 'minimal',
      perms: ['storage.objects.get', 'run.routes.invoke'],
    });
  });

  it('ArrowDown moves into the results, ArrowUp returns to the input, Esc clears', async () => {
    await mount();
    const input = await type('storage');
    await key(input, 'ArrowDown');
    expect(document.activeElement).toBe(rows()[0]);
    await key(rows()[0], 'ArrowUp');
    expect(document.activeElement).toBe(input);
    await key(input, 'Escape');
    expect((host!.querySelector('input') as HTMLInputElement).value).toBe('');
  });

  it('shows suggestions when nothing matches', async () => {
    await mount();
    await type('zzzzqqq');
    expect(host!.textContent).toContain('No results for “zzzzqqq”');
    expect(host!.textContent).toContain('Try one of these');
  });

  it('restores the query from the route and mirrors edits into the hash', async () => {
    await mount('run');
    expect((host!.querySelector('input') as HTMLInputElement).value).toBe('run');
    expect(host!.textContent).toContain('Cloud Run Invoker');
    vi.useFakeTimers();
    await type('storage');
    await act(async () => void vi.advanceTimersByTime(300));
    expect(location.hash).toBe('#/search?q=storage');
  });

  it('highlights matches through the CSS Custom Highlight API when available', async () => {
    const set = vi.fn();
    const ranges: unknown[][] = [];
    vi.stubGlobal('CSS', { highlights: { set, delete: vi.fn() } });
    vi.stubGlobal(
      'Highlight',
      class {
        constructor(...r: unknown[]) {
          ranges.push(r);
        }
      },
    );
    await mount();
    await type('storage');
    expect(set).toHaveBeenCalledWith('search-hit', expect.anything());
    expect(ranges.at(-1)!.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
