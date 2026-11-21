import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

const PAGES = [
  { name: 'popup', hash: '#q=storage' },
  { name: 'popup', hash: '' },
  { name: 'sidepanel', hash: '#q=storage' },
  { name: 'sidepanel', hash: '' },
  { name: 'sidepanel', hash: '#role=roles/storage.admin' },
  { name: 'sidepanel', hash: '#perm=storage.objects.get' },
  { name: 'options', hash: '' },
];

for (const scheme of ['light', 'dark'] as const) {
  for (const { name, hash } of PAGES) {
    test(`axe: ${name}${hash} (${scheme})`, async ({ context, extensionId }) => {
      const page = await context.newPage();
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(`chrome-extension://${extensionId}/${name}.html${hash}`);
      await page.waitForLoadState('networkidle');
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
