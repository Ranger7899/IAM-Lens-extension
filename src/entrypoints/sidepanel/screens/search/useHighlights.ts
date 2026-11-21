import { useEffect, type RefObject } from 'react';

/** Query words worth highlighting: split on the same separators the index uses, lower-cased, longest first. */
export function highlightTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(/[\s/._:@,;()[\]{}'"`-]+/)
    .filter(Boolean);
  return [...new Set(terms)].sort((a, b) => b.length - a.length);
}

interface HighlightApi {
  highlights: { set(name: string, h: unknown): void; delete(name: string): void };
}

/**
 * Marks every occurrence of the query terms inside `ref` with the CSS Custom Highlight API
 * (`::highlight(search-hit)`, styled in highlight.css). It decorates the text in place, so
 * PermissionToken and the role rows keep their own markup. No-op where the API is missing.
 */
export function useHighlights(ref: RefObject<HTMLElement | null>, terms: string[], deps: unknown[]) {
  const key = terms.join('\u0000');
  useEffect(() => {
    const css = (globalThis as { CSS?: Partial<HighlightApi> }).CSS;
    const HighlightCtor = (globalThis as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    const root = ref.current;
    if (!css?.highlights || !HighlightCtor || !root) return;
    const ranges: Range[] = [];
    if (key) {
      const needles = key.split('\u0000');
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.nodeValue ?? '').toLowerCase();
        if (!text.trim()) continue;
        const taken: [number, number][] = [];
        for (const t of needles) {
          for (let at = text.indexOf(t); at >= 0; at = text.indexOf(t, at + t.length)) {
            const end = at + t.length;
            if (taken.some(([a, b]) => at < b && end > a)) continue;
            taken.push([at, end]);
            const r = document.createRange();
            r.setStart(n, at);
            r.setEnd(n, end);
            ranges.push(r);
          }
        }
      }
    }
    css.highlights.set('search-hit', new HighlightCtor(...ranges));
    return () => css.highlights?.delete('search-hit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, key, ...deps]);
}
