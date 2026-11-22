// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, useEffect } from 'react';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createRoot, type Root } from 'react-dom/client';
import { SIDE_PANEL_TABS_KEY, useSidePanelTabs, type SidePanelTabs } from './useSidePanelTabs';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let host: HTMLElement | undefined;
let latest: SidePanelTabs;
let setter: (p: Partial<SidePanelTabs>) => void;

function Probe() {
  const [tabs, set] = useSidePanelTabs();
  useEffect(() => {
    latest = tabs;
    setter = set;
  });
  return null;
}

async function mount() {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<Probe />));
}

beforeEach(() => {
  fakeBrowser.reset();
  localStorage.clear();
});
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

describe('useSidePanelTabs', () => {
  it('defaults to both tabs hidden', async () => {
    await mount();
    expect(latest).toEqual({ minimal: false, compare: false });
  });

  it('persists a change to chrome.storage.local, merging with the other flag', async () => {
    await mount();
    await act(async () => setter({ minimal: true }));
    expect(latest).toEqual({ minimal: true, compare: false });
    await act(async () => setter({ compare: true }));
    expect((await browser.storage.local.get(SIDE_PANEL_TABS_KEY))[SIDE_PANEL_TABS_KEY]).toEqual({
      minimal: true,
      compare: true,
    });
  });

  it('loads the stored value', async () => {
    await browser.storage.local.set({ [SIDE_PANEL_TABS_KEY]: { minimal: false, compare: true } });
    await mount();
    expect(latest).toEqual({ minimal: false, compare: true });
  });

  it('live-updates when storage changes elsewhere, and ignores junk', async () => {
    await mount();
    await act(async () =>
      browser.storage.local.set({ [SIDE_PANEL_TABS_KEY]: { minimal: true, compare: true } }),
    );
    expect(latest).toEqual({ minimal: true, compare: true });
    await act(async () => browser.storage.local.set({ [SIDE_PANEL_TABS_KEY]: 'nope' }));
    expect(latest).toEqual({ minimal: false, compare: false });
  });
});
