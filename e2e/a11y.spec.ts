import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

interface Target {
  name: 'popup' | 'sidepanel' | 'options';
  hash: string;
  /** Legacy demo harness (`?demo=1`) instead of the real router. */
  demo?: boolean;
  label?: string;
  /** A selector that proves the screen has rendered real content before axe runs. */
  ready?: string;
  /** Known app bug: skip with this reason until fixed (see the IAM-24 follow-up). */
  fixme?: string;
}

const VE = '#/compare?a=roles%2Fviewer&b=roles%2Feditor';
const FIVE = encodeURIComponent('storage.objects.get,storage.objects.list,pubsub.topics.publish');

const PAGES: Target[] = [
  // popup
  { name: 'popup', hash: '', label: 'popup empty' },
  { name: 'popup', hash: '#q=storage', label: 'popup results' },
  // legacy demo harness
  { name: 'sidepanel', hash: '#q=storage', demo: true },
  { name: 'sidepanel', hash: '', demo: true },
  { name: 'sidepanel', hash: '#role=roles/storage.admin', demo: true },
  { name: 'sidepanel', hash: '#perm=storage.objects.get', demo: true },
  { name: 'options', hash: '' },
  { name: 'options', hash: '#whatsnew', label: 'options whatsnew', ready: '#whatsnew h2' },
  // real router: every screen
  { name: 'sidepanel', hash: '#/search', label: 'search empty', ready: 'main' },
  { name: 'sidepanel', hash: '#/search?q=storage', label: 'search results', ready: '[role=tabpanel]' },
  { name: 'sidepanel', hash: '#/role/roles%2Fviewer', label: 'role detail', ready: 'h2' },
  {
    name: 'sidepanel',
    hash: '#/permission/storage.objects.get',
    label: 'permission detail',
    ready: 'article',
  },
  {
    name: 'sidepanel',
    hash: '#/permission/storage.objects.*',
    label: 'permission picker',
    ready: 'h2',
  },
  { name: 'sidepanel', hash: '#/minimal', label: 'minimal empty', ready: 'textarea' },
  { name: 'sidepanel', hash: `#/minimal?perms=${FIVE}`, label: 'minimal results', ready: 'article' },
  { name: 'sidepanel', hash: '#/compare', label: 'compare empty', ready: 'main' },
  { name: 'sidepanel', hash: VE, label: 'compare diff', ready: 'main article' },
  { name: 'sidepanel', hash: '#/whatsnew', label: 'whatsnew moved stub', ready: 'main h2' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const { name, hash, demo, label, ready, fixme } of PAGES) {
    const title = label ?? `${name}${hash}${demo ? ' demo' : ''}`;
    test(`axe: ${title} (${scheme})`, async ({ context, extensionId }) => {
      test.fixme(!!fixme, fixme);
      const page = await context.newPage();
      await page.setViewportSize(
        name === 'popup' ? { width: 380, height: 560 } : { width: 400, height: 800 },
      );
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(`chrome-extension://${extensionId}/${name}.html${demo ? '?demo=1' : ''}${hash}`);
      if (ready) await page.locator(ready).first().waitFor();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
        .analyze();
      const bad = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        bad.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.slice(0, 3).map((n) => n.html + ' :: ' + n.failureSummary),
        })),
      ).toEqual([]);
    });
  }
}
