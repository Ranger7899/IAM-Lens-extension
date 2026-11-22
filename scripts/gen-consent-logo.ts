/**
 * Renders scripts/brand/icon.svg to scripts/brand/consent-logo-120.png (120x120, for the OAuth consent screen).
 * Uses Playwright's Chromium, like gen-icon.ts. Run: npm run gen:consent-logo   (output is committed)
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const svg = readFileSync(root('./brand/icon.svg'), 'utf8');
const SIZE = 120;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
await page.setContent(
  `<style>html,body{margin:0;background:transparent}svg{display:block;width:${SIZE}px;height:${SIZE}px}</style>${svg}`,
);
const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
writeFileSync(root('./brand/consent-logo-120.png'), png);
await browser.close();
console.log('wrote scripts/brand/consent-logo-120.png');
