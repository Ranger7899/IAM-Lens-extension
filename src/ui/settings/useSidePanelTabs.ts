/**
 * Which optional side-panel tabs are shown. Search is always there; Minimal and Compare are opt-in
 * (both hidden by default). The choice lives in `chrome.storage.local` (source of truth, shared by the
 * options page and the side panel) with a `localStorage` mirror so the side panel renders the right
 * tab bar on its first paint instead of flashing it in after the async storage read.
 */
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

export interface SidePanelTabs {
  minimal: boolean;
  compare: boolean;
}
export const SIDE_PANEL_TABS_KEY = 'sidePanelTabs';
export const DEFAULT_SIDE_PANEL_TABS: SidePanelTabs = { minimal: false, compare: false };

/** Coerce anything stored into a valid value; unknown or missing fields fall back to hidden. */
export function parseSidePanelTabs(v: unknown): SidePanelTabs {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return { minimal: o.minimal === true, compare: o.compare === true };
}

function readMirror(): SidePanelTabs {
  try {
    const raw = localStorage.getItem(SIDE_PANEL_TABS_KEY);
    return raw ? parseSidePanelTabs(JSON.parse(raw)) : DEFAULT_SIDE_PANEL_TABS;
  } catch {
    return DEFAULT_SIDE_PANEL_TABS;
  }
}

function writeMirror(v: SidePanelTabs): void {
  try {
    localStorage.setItem(SIDE_PANEL_TABS_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable: the mirror only speeds up first paint */
  }
}

const same = (a: SidePanelTabs, b: SidePanelTabs) => a.minimal === b.minimal && a.compare === b.compare;

/** Returns the tab visibility and a setter that merges a partial change; follows other extension pages live. */
export function useSidePanelTabs(): [SidePanelTabs, (patch: Partial<SidePanelTabs>) => void] {
  const [tabs, setTabs] = useState<SidePanelTabs>(readMirror);

  useEffect(() => {
    let live = true;
    const adopt = (raw: unknown) => {
      const next = parseSidePanelTabs(raw);
      writeMirror(next);
      setTabs((cur) => (same(cur, next) ? cur : next));
    };
    void browser.storage.local
      .get(SIDE_PANEL_TABS_KEY)
      .then((r) => {
        if (live) adopt(r[SIDE_PANEL_TABS_KEY]);
      })
      .catch(() => {});
    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'local' && SIDE_PANEL_TABS_KEY in changes) adopt(changes[SIDE_PANEL_TABS_KEY].newValue);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      live = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const set = useCallback(
    (patch: Partial<SidePanelTabs>) => {
      const next = { ...tabs, ...patch };
      setTabs(next);
      writeMirror(next);
      void browser.storage.local.set({ [SIDE_PANEL_TABS_KEY]: next }).catch(() => {});
    },
    [tabs],
  );

  return [tabs, set];
}
