/**
 * Theme override (System / Light / Dark). The choice lives in `chrome.storage.local` (source of
 * truth, shared by every extension page) with a `localStorage` mirror so a page can apply it on its
 * first render without waiting for the async storage read. Applied as `data-theme` on <html>; the
 * `system` choice removes the attribute so `prefers-color-scheme` decides.
 */
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'themePreference';

const isPref = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

function readMirror(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePreference): void {
  const el = document.documentElement;
  if (pref === 'system') delete el.dataset.theme;
  else el.dataset.theme = pref;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage unavailable: the override only lasts for this page */
  }
}

/** Returns the stored preference and a setter; applies it to the document and follows other pages. */
export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const [pref, setPref] = useState<ThemePreference>(readMirror);

  useEffect(() => {
    applyTheme(pref);
  }, [pref]);

  useEffect(() => {
    let live = true;
    void browser.storage.local
      .get(THEME_STORAGE_KEY)
      .then((r) => {
        const v = r[THEME_STORAGE_KEY];
        if (live && isPref(v)) setPref(v);
      })
      .catch(() => {});
    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      const v = changes[THEME_STORAGE_KEY]?.newValue;
      if (area === 'local' && isPref(v)) setPref(v);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      live = false;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const set = useCallback((next: ThemePreference) => {
    setPref(next);
    void browser.storage.local.set({ [THEME_STORAGE_KEY]: next }).catch(() => {});
  }, []);

  return [pref, set];
}
