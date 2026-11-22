// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { CustomRoleInput, MetaRecord } from '@/core';
import type { SyncDeps } from '@/ui/data/customSync';
import { CustomSyncRow } from './CustomSyncRow';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

function deps(
  signedIn: boolean,
  meta: MetaRecord = {},
): SyncDeps & { listProjects: ReturnType<typeof vi.fn> } {
  let m = meta;
  let stored: CustomRoleInput[] = [];
  return {
    isSignedIn: async () => signedIn,
    listProjects: vi.fn(async () => [{ id: 'a', displayName: 'A', name: 'projects/1' }]),
    listOrganizations: async () => [],
    fetchRoles: async (p) => [{ name: `${p}/roles/r`, perms: [], source: { kind: 'custom', parent: p } }],
    storedRoles: async () => stored,
    saveRoles: async (r) => void (stored = [...stored, ...r]),
    deleteRolesByParent: async () => {},
    getMeta: async () => m,
    patchMeta: async (p) => (m = { ...m, ...p }),
    signalChanged: () => {},
  };
}

async function mount(d: SyncDeps) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<CustomSyncRow deps={d} />));
  await act(async () => void (await new Promise((r) => setTimeout(r, 20))));
}

describe('CustomSyncRow', () => {
  it('renders nothing and never syncs while signed out', async () => {
    const d = deps(false);
    await mount(d);
    expect(host!.textContent).toBe('');
    expect(d.listProjects).not.toHaveBeenCalled();
  });

  it('auto-syncs on mount when never synced and shows the summary', async () => {
    const d = deps(true);
    await mount(d);
    expect(d.listProjects).toHaveBeenCalledTimes(1);
    expect(host!.textContent).toContain('Custom roles');
    expect(host!.textContent).toContain('1 from 1 project');
    expect(host!.textContent).toContain('synced just now');
  });

  it('does not sync on mount when the last sync is fresh; the button refreshes', async () => {
    const d = deps(true, {
      customSyncedAt: new Date().toISOString(),
      customSources: [{ parent: 'projects/a', kind: 'project', displayName: 'A', roleCount: 3 }],
    });
    await mount(d);
    expect(d.listProjects).not.toHaveBeenCalled();
    expect(host!.textContent).toContain('3 from 1 project');
    const btn = host!.querySelector<HTMLButtonElement>('button[aria-label="Refresh custom roles"]')!;
    await act(async () => btn.click());
    await act(async () => void (await new Promise((r) => setTimeout(r, 20))));
    expect(d.listProjects).toHaveBeenCalledTimes(1);
  });
});
