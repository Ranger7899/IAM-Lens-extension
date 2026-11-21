/**
 * Renders scripts/brand/icon*.svg to public/icon/{16,32,48,128}.png (WXT picks these up automatically).
 * Uses Playwright's Chromium, so no extra image dependency. Run: npm run gen:brand   (output is committed)
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const full = readFileSync(root('./brand/icon.svg'), 'utf8');
const small = readFileSync(root('./brand/icon-small.svg'), 'utf8');

const browser = await chromium.launch();
for (const size of [16, 32, 48, 128]) {
  const svg = size <= 32 ? small : full;
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  const png = await page.screenshot({
    omitBackground: true,
    clip: { x: 0, y: 0, width: size, height: size },
  });
  writeFileSync(root(`../public/icon/${size}.png`), png);
  await page.close();
}
await browser.close();
console.log('wrote public/icon/{16,32,48,128}.png');
