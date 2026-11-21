/**
 * Chrome Web Store listing images, generated from the real build:
 *   npm run build && npm run store:assets
 * Gated by STORE_ASSETS=1 (see playwright.config.ts), so the default e2e run skips it.
 * Output: docs/store-assets/ (+ copies in docs/screens/IAM-26/). Templates: e2e/store-templates/*.html.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { test } from './fixtures';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'docs', 'store-assets');
const COPY = path.join(ROOT, 'docs', 'screens', 'IAM-26');
const TPL = path.join(import.meta.dirname, 'store-templates');
const FONT_DIR = path.join(ROOT, 'node_modules', '@fontsource-variable');
const b64 = (f: string) => readFileSync(f).toString('base64');
const FLEX = b64(
  path.join(FONT_DIR, 'google-sans-flex', 'files', 'google-sans-flex-latin-wght-normal.woff2'),
);
const CODE = b64(
  path.join(FONT_DIR, 'google-sans-code', 'files', 'google-sans-code-latin-wght-normal.woff2'),
);
const ICON = readFileSync(path.join(ROOT, 'scripts', 'brand', 'icon.svg'), 'utf8');

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`template var ${k} missing`);
    return vars[k];
  });
const tpl = (name: string) => readFileSync(path.join(TPL, name), 'utf8');
const dataUri = (buf: Buffer) => `data:image/png;base64,${buf.toString('base64')}`;

type Scheme = 'light' | 'dark';
const PANEL = { width: 400, height: 740 };
const POPUP = { width: 380, height: 560 };
const tok = (s: string, r: string, v: string, cls: string) =>
  `<span class="s">${s}</span><span class="r">.${r}.</span><span class="v ${cls}">${v}</span>`;

interface Shot {
  name: string;
  num: string;
  eyebrow: string;
  headline: string;
  sub: string;
  token: string;
  accent: string;
  hash: string;
  wait: string;
  act?: (p: Page) => Promise<void>;
  popup?: boolean;
}
const FIVE = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];
const SHOTS: Shot[] = [
  {
    name: '1-search',
    num: '01',
    eyebrow: 'Search',
    headline: 'Find the role.<br><em>Or the permission.</em>',
    sub: 'One box, two directions. Search from the toolbar, the side panel or the address bar.',
    token: '',
    accent: 'var(--blue)',
    hash: '#/',
    wait: 'main',
    popup: true,
    act: async (p) => {
      await p.getByRole('searchbox').fill('storage');
      await p.waitForSelector('main [role="tab"], main li');
    },
  },
  {
    name: '2-role-detail',
    num: '02',
    eyebrow: 'Role detail',
    headline: 'Every permission,<br><em>grouped by service.</em>',
    sub: 'Open any role and see what it can really do, colour-coded by privilege.',
    token: '<span class="s">roles/storage</span><span class="r">.objectViewer</span>',
    accent: 'var(--read)',
    hash: `#/role/${encodeURIComponent('roles/storage.objectViewer')}`,
    wait: 'main article',
  },
  {
    name: '3-permission-detail',
    num: '03',
    eyebrow: 'Permission detail',
    headline: 'Smallest role<br><em>first.</em>',
    sub: 'See every role that grants a permission, with a least-privilege hint.',
    token: tok('storage', 'objects', 'get', 'read'),
    accent: 'var(--read)',
    hash: '#/permission/storage.objects.get',
    wait: 'article',
  },
  {
    name: '4-minimal-roles',
    num: '04',
    eyebrow: 'Minimal roles',
    headline: 'Fewest roles<br><em>that cover it all.</em>',
    sub: 'Paste the permissions you need. Get the smallest set of roles that grants them all.',
    token: tok('pubsub', 'topics', 'publish', 'write'),
    accent: 'var(--write)',
    hash: `#/minimal?perms=${encodeURIComponent(FIVE.join(','))}`,
    wait: 'main textarea',
  },
  {
    name: '5-compare',
    num: '05',
    eyebrow: 'Compare',
    headline: 'Two roles,<br><em>side by side.</em>',
    sub: 'Spot exactly what an upgrade adds, before you grant it.',
    token:
      '<span class="s">roles/viewer</span><span class="r">&nbsp;→&nbsp;</span><span class="v write">roles/editor</span>',
    accent: 'var(--blue)',
    hash: '#/compare?a=roles%2Fviewer&b=roles%2Feditor',
    wait: 'main article',
  },
];

async function capture(
  context: BrowserContext,
  url: string,
  scheme: Scheme,
  size: { width: number; height: number },
  wait: string,
  act?: (p: Page) => Promise<void>,
): Promise<Buffer> {
  const page = await context.newPage();
  await page.setViewportSize(size);
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(url);
  await page.waitForSelector(wait);
  await page.evaluate(() => document.fonts.ready);
  await act?.(page);
  await page.waitForTimeout(1200);
  const buf = await page.screenshot({ scale: 'device' });
  await page.close();
  return buf;
}

async function render(context: BrowserContext, html: string, w: number, h: number, file: string) {
  const page = await context.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const out = path.join(OUT, file);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  copyFileSync(out, path.join(COPY, file));
}

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(COPY, { recursive: true });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SHOTS) {
    test(`shot ${s.name} (${scheme})`, async ({ context, extensionId }) => {
      const base = `chrome-extension://${extensionId}`;
      const panel = await capture(context, `${base}/sidepanel.html${s.hash}`, scheme, PANEL, s.wait, s.act);
      let popupHtml = '';
      if (s.popup) {
        const popup = await capture(context, `${base}/popup.html`, scheme, POPUP, 'input', async (p) => {
          await p.getByRole('searchbox').fill('storage.objects.get');
          await p.getByRole('list', { name: 'Top results' }).locator('li').first().waitFor();
        });
        popupHtml = `<div class="shot popup"><img src="${dataUri(popup)}"></div>`;
      }
      const html = fill(tpl('shot.html'), {
        THEME: scheme,
        FLEX,
        CODE,
        ICON,
        LAYOUT: s.popup ? 'has-popup' : '',
        NUM: s.num,
        EYEBROW: s.eyebrow,
        HEADLINE: s.headline,
        SUB: s.sub,
        TOKEN: s.token,
        ACCENT: s.accent,
        PANEL: dataUri(panel),
        POPUPHTML: popupHtml,
      });
      await render(context, html, 1280, 800, `screenshot-${s.name}-${scheme}.png`);
    });
  }
}

const TILE = {
  FLEX,
  ICON,
  EXTRA_CSS: '',
  EXTRA_HTML: '',
};
test('promo tile 440x280', async ({ context }) => {
  const html = fill(tpl('tile.html'), {
    ...TILE,
    W: '440',
    H: '280',
    PITCH: '16',
    GL: '260',
    GLH: '90',
    GLS: '200',
    GLS2: '120',
    PAD: '28',
    ISZ: '72',
    HS: '44',
    PM: '8',
    PS: '17',
    BM: '16',
    BH: '7',
    BW: '200',
    TITLE: 'IAM Lens',
    TAG: 'Find the role. Find the permission.',
  });
  await render(context, html, 440, 280, 'promo-tile-440x280.png');
});

test('marquee 1400x560', async ({ context, extensionId }) => {
  const base = `chrome-extension://${extensionId}`;
  const size = { width: 400, height: 560 };
  const a = await capture(
    context,
    `${base}/sidepanel.html#/permission/storage.objects.get`,
    'light',
    size,
    'article',
  );
  const b = await capture(
    context,
    `${base}/sidepanel.html#/role/${encodeURIComponent('roles/storage.objectViewer')}`,
    'light',
    size,
    'main article',
  );
  const extraCss = `
.p{position:absolute;width:400px;border-radius:26px 26px 0 0;overflow:hidden;box-shadow:0 1px 2px rgba(15,30,70,.12),0 18px 40px -8px rgba(15,40,110,.28),0 50px 100px -20px rgba(15,40,110,.28);background:#fff}
.p img{display:block;width:400px}
.p1{left:570px;top:120px;height:440px}.p2{left:1000px;top:44px;height:516px}`;
  const extraHtml = `<div class="p p1"><img src="${dataUri(a)}"></div><div class="p p2"><img src="${dataUri(b)}"></div>`;
  const html = fill(tpl('tile.html'), {
    ...TILE,
    W: '1400',
    H: '560',
    PITCH: '24',
    GL: '520',
    GLH: '160',
    GLS: '300',
    GLS2: '160',
    PAD: '84',
    ISZ: '104',
    HS: '88',
    PM: '16',
    PS: '28',
    BM: '28',
    BH: '10',
    BW: '320',
    TITLE: 'IAM Lens',
    TAG: 'Find the role. Find the permission.<br>Instant two-way IAM lookup.',
    EXTRA_CSS: extraCss,
    EXTRA_HTML: extraHtml,
  });
  await render(context, html, 1400, 560, 'marquee-1400x560.png');
});
