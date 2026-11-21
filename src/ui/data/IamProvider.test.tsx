// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { makeSnapshot } from '@/core/__tests__/fixtures';
import { IamGate, IamProvider, useIam, type IamValue, type SnapshotLoader } from './IamProvider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

function Probe({ onValue }: { onValue: (v: IamValue) => void }) {
  onValue(useIam());
  return null;
}

async function mountWith(loader: SnapshotLoader, strict = false) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  let latest!: IamValue;
  const tree = (
    <IamProvider loader={loader}>
      <Probe onValue={(v) => (latest = v)} />
      <IamGate>
        <p id="ready">ready</p>
      </IamGate>
    </IamProvider>
  );
  await act(async () => root!.render(strict ? <StrictMode>{tree}</StrictMode> : tree));
  return () => latest;
}

describe('IamProvider', () => {
  it('loads once, exposes the index and snapshot meta, then warms search when idle', async () => {
    const snapshot = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.things.get'] }]);
    const loader = vi.fn(async () => ({ snapshot, source: 'bundled' as const }));
    const get = await mountWith(loader, true); // StrictMode double-invokes effects
    expect(get().status).toBe('ready');
    expect(get().index?.findRole('a.viewer')).toBeDefined();
    expect(get().snapshotMeta).toEqual({
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      source: 'bundled',
    });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(host!.querySelector('#ready')).not.toBeNull();
    expect(document.documentElement.dataset.ready).toBe('true');
    const warm = vi.spyOn(get().index!, 'warmSearchIdle');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120));
    });
    expect(warm).toHaveBeenCalled();
  });

  it('shows a skeleton while loading', async () => {
    const get = await mountWith(() => new Promise(() => {}));
    expect(get().status).toBe('loading');
    expect(host!.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(host!.querySelector('#ready')).toBeNull();
  });

  it('shows an error card and retry reloads', async () => {
    const snapshot = await makeSnapshot([{ name: 'roles/a.viewer', perms: ['a.things.get'] }]);
    const loader = vi
      .fn<SnapshotLoader>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ snapshot, source: 'stored' });
    const get = await mountWith(loader);
    expect(get().status).toBe('error');
    expect(get().error?.message).toBe('boom');
    const alert = host!.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('boom');
    const retry = [...alert.querySelectorAll('button')].find((b) => b.textContent?.includes('Retry'))!;
    await act(async () => retry.click());
    expect(get().status).toBe('ready');
    expect(get().snapshotMeta?.source).toBe('stored');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
