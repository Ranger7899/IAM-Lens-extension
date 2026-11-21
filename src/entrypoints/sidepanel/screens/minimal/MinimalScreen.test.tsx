// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider } from '@/ui/data';
import { MinimalScreen } from '../MinimalScreen';
import { gcloudBinding, parsePermissionText } from './parse';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  history.replaceState(null, '', '#/minimal');
});

async function mount(perms?: string[]) {
  const snapshot = await makeSnapshot([
    {
      name: 'roles/storage.objectViewer',
      title: 'Storage Object Viewer',
      perms: ['storage.objects.get', 'storage.objects.list'],
    },
    {
      name: 'roles/storage.admin',
      title: 'Storage Admin',
      perms: [
        'storage.objects.get',
        'storage.objects.list',
        'storage.objects.delete',
        'storage.buckets.create',
      ],
    },
    { name: 'roles/old.thing', title: 'Old', stage: 'DEPRECATED', perms: ['old.things.get'] },
    { name: 'roles/ghost.none', title: 'Ghost', perms: ['ghost.things.get'] },
  ]);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      <IamProvider loader={async () => ({ snapshot, source: 'bundled' as const })}>
        <IamGate>
          <MinimalScreen perms={perms} />
        </IamGate>
      </IamProvider>,
    ),
  );
}
async function type(value: string) {
  const ta = host!.querySelector('textarea')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(ta, value);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('parsePermissionText', () => {
  it('splits on newlines, commas and spaces, dedupes and flags bad shapes', () => {
    const t = parsePermissionText('a.b.c, d.e.f\ng.h.i  a.b.c objects.get roles/viewer');
    expect(t.map((x) => x.text)).toEqual(['a.b.c', 'd.e.f', 'g.h.i', 'objects.get', 'roles/viewer']);
    expect(t.map((x) => x.valid)).toEqual([true, true, true, false, false]);
  });
  it('builds a gcloud snippet with placeholders', () => {
    expect(gcloudBinding('roles/x')).toContain('PROJECT_ID');
    expect(gcloudBinding('roles/x')).toContain('--member="MEMBER"');
  });
});

describe('MinimalScreen', () => {
  it('maps [storage.objects.get, storage.objects.list] to a storage viewer role', async () => {
    await mount();
    await type('storage.objects.get\nstorage.objects.list');
    const roles = [...host!.querySelectorAll('article h3')].map((h) => h.textContent);
    expect(roles).toEqual(['Storage Object Viewer']);
    expect(host!.textContent).toContain('Coverage matrix');
    expect(host!.querySelector('table')).not.toBeNull();
  });

  it('shows unknown, uncoverable and discouraged states', async () => {
    await mount();
    await type('storage.objects.get, nope.things.get, objects.get old.things.get');
    expect(host!.querySelector('section[aria-label="Unknown"]')!.textContent).toContain('nope.things.get');
    expect(host!.textContent).toContain('objects.get');
    expect(host!.querySelector('[role=note]')!.textContent).toMatch(/Deprecated/);
  });

  it('prefills from route perms', async () => {
    await mount(['storage.objects.get', 'storage.objects.list']);
    expect(host!.querySelector('textarea')!.value).toBe('storage.objects.get\nstorage.objects.list');
    expect(host!.textContent).toContain('Storage Object Viewer');
  });

  it('copies role IDs and a gcloud snippet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await mount(['storage.objects.get', 'storage.objects.list']);
    const chip = (re: RegExp) =>
      [...host!.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''))!;
    await act(async () => chip(/Copy role IDs/).click());
    expect(writeText).toHaveBeenLastCalledWith('roles/storage.objectViewer');
    await act(async () => chip(/gcloud commands/).click());
    expect(writeText.mock.lastCall![0]).toContain('--role="roles/storage.objectViewer"');
  });
});
