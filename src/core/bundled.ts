/**
 * The snapshot shipped inside the extension. Imported with `?url` so Vite emits it as a separate
 * hashed asset (not inlined into the JS bundle); it is fetched from the extension origin at runtime.
 * Kept in its own module so unit tests can inject a loader instead of importing this.
 */
import bundledUrl from '../../data/roles.snapshot.json?url';

export async function loadBundledSnapshotJson(): Promise<unknown> {
  const url =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(bundledUrl) : bundledUrl;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bundled snapshot fetch failed: HTTP ${res.status}`);
  return res.json();
}
