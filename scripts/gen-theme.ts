/**
 * Generates src/ui/theme/tokens.css (colour roles) from the Cloud Console palette.
 * Run: npm run gen:theme   (output is committed)
 *
 * Source of truth: docs/console-reference.md (measured light + dark values). Entries marked
 * `derived` fill gaps the reference does not cover (see docs/design.md). The script also checks
 * WCAG contrast for every text pair and the 3:1 rule for risk bar fills, and fails the run if any
 * pair regresses.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Palette = Record<string, string>;

/** Console roles. The `--console-*` names are the direct, measured console tokens. */
const LIGHT: Palette = {
  // measured
  shell: '#f0f5fe',
  panel: '#ffffff',
  tableHeader: '#e9eef6',
  border: '#b7c3e0',
  navActive: '#dbedfc',
  text: '#1b2e5d',
  textSecondary: '#475569',
  link: '#3d60b8',
  accent: '#314f9b',
  icon: '#545f72',
  chip: '#467c95',
  onChip: '#ffffff',
  tooltip: '#2d437c',
  onTooltip: '#f1f4f9',
  // derived
  divider: '#d3dbec', // between border and header, for hairlines
  onAccent: '#ffffff',
  headerStrong: '#dde5f2', // pressed / highest container
  error: '#b3261e',
  onError: '#ffffff',
  errorContainer: '#fce8e6',
  onErrorContainer: '#5f1410',
  read: '#17703f',
  readFill: '#2a9a5d',
  readContainer: '#dff2e6',
  onReadContainer: '#0f4a29',
  write: '#8f5200',
  writeFill: '#b36d00',
  writeContainer: '#fbebcc',
  onWriteContainer: '#5c3500',
  admin: '#b3261e',
  adminFill: '#d4483d',
  adminContainer: '#fce4e1',
  onAdminContainer: '#6e1410',
};

const DARK: Palette = {
  // measured
  shell: '#282c32',
  panel: '#353b43',
  tableHeader: '#414d5e',
  border: '#50638b',
  navActive: '#2a3f5e',
  text: '#f1f4f9',
  textSecondary: '#b9c0cc',
  link: '#e5ebff',
  accent: '#a8baff',
  icon: '#9ca6b2',
  chip: '#8fbed4',
  onChip: '#1b2e5d',
  tooltip: '#2d437c', // measured in light only; reused (derived for dark)
  onTooltip: '#f1f4f9',
  // derived
  divider: '#4a5568',
  onAccent: '#1b2e5d',
  headerStrong: '#3d4758',
  error: '#f2b8b5',
  onError: '#601410',
  errorContainer: '#5a3236',
  onErrorContainer: '#fde2e0',
  read: '#7fd4a2',
  readFill: '#4fb47c',
  readContainer: '#2c4a3d',
  onReadContainer: '#c6f1d7',
  write: '#f0b865',
  writeFill: '#d99a2b',
  writeContainer: '#54432a',
  onWriteContainer: '#ffe2b0',
  admin: '#ffa59c',
  adminFill: '#f07f74',
  adminContainer: '#5c3335',
  onAdminContainer: '#ffd6d1',
};

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function check(name: string, p: Palette) {
  const text: [string, string, string][] = [];
  for (const bg of ['panel', 'shell', 'tableHeader', 'headerStrong']) {
    for (const fg of ['text', 'textSecondary', 'link', 'accent']) text.push([fg, bg, `${fg} on ${bg}`]);
  }
  for (const k of ['read', 'write', 'admin'])
    for (const bg of ['panel', 'tableHeader']) text.push([k, bg, `${k} on ${bg}`]);
  for (const k of ['read', 'write', 'admin']) {
    text.push([`on${k[0].toUpperCase()}${k.slice(1)}Container`, `${k}Container`, `${k} on-container`]);
  }
  text.push(
    ['onAccent', 'accent', 'onAccent on accent'],
    ['onChip', 'chip', 'chip'],
    ['onError', 'error', 'err'],
  );
  text.push(['onErrorContainer', 'errorContainer', 'err container'], ['onTooltip', 'tooltip', 'tooltip']);
  text.push(['text', 'navActive', 'text on navActive']);
  const bad: string[] = [];
  for (const [fg, bg, label] of text) {
    const r = ratio(p[fg], p[bg]);
    if (r < 4.5) bad.push(`${name}: ${label} ${r.toFixed(2)} < 4.5`);
  }
  for (const k of ['read', 'write', 'admin']) {
    for (const bg of ['panel', 'tableHeader']) {
      const r = ratio(p[`${k}Fill`], p[bg]);
      if (r < 3) bad.push(`${name}: ${k} fill on ${bg} ${r.toFixed(2)} < 3`);
    }
  }
  if (bad.length) throw new Error(`Contrast failures:\n${bad.join('\n')}`);
}
check('light', LIGHT);
check('dark', DARK);

function roles(p: Palette, dark: boolean): string[] {
  const v: [string, string][] = [
    // --- 3 tonal layers + console primitives
    ['console-shell', p.shell],
    ['console-panel', p.panel],
    ['console-table-header', p.tableHeader],
    ['console-border', p.border],
    ['console-divider', p.divider],
    ['console-nav-active', p.navActive],
    ['console-link', p.link],
    ['console-accent', p.accent],
    ['console-icon', p.icon],
    ['console-chip', p.chip],
    ['console-on-chip', p.onChip],
    ['console-tooltip', p.tooltip],
    ['console-on-tooltip', p.onTooltip],
    // --- M3-named roles consumed by components (values are the console palette)
    ['md-sys-color-background', p.panel],
    ['md-sys-color-on-background', p.text],
    ['md-sys-color-surface', p.panel],
    ['md-sys-color-surface-dim', p.shell],
    ['md-sys-color-surface-bright', p.panel],
    ['md-sys-color-surface-container-lowest', p.panel],
    ['md-sys-color-surface-container-low', p.panel],
    ['md-sys-color-surface-container', p.shell],
    ['md-sys-color-surface-container-high', p.tableHeader],
    ['md-sys-color-surface-container-highest', p.headerStrong],
    ['md-sys-color-on-surface', p.text],
    ['md-sys-color-surface-variant', p.tableHeader],
    ['md-sys-color-on-surface-variant', p.textSecondary],
    ['md-sys-color-inverse-surface', dark ? '#e5ebff' : p.tooltip],
    ['md-sys-color-inverse-on-surface', dark ? '#1b2e5d' : p.onTooltip],
    ['md-sys-color-outline', p.border],
    ['md-sys-color-outline-variant', p.divider],
    ['md-sys-color-shadow', '#000000'],
    ['md-sys-color-scrim', '#000000'],
    ['md-sys-color-surface-tint', p.accent],
    ['md-sys-color-primary', p.accent],
    ['md-sys-color-on-primary', p.onAccent],
    ['md-sys-color-primary-container', p.navActive],
    ['md-sys-color-on-primary-container', dark ? '#e5ebff' : p.text],
    ['md-sys-color-inverse-primary', dark ? '#314f9b' : '#a8baff'],
    ['md-sys-color-secondary', p.textSecondary],
    ['md-sys-color-on-secondary', p.panel],
    ['md-sys-color-secondary-container', p.navActive],
    ['md-sys-color-on-secondary-container', dark ? '#e5ebff' : p.text],
    ['md-sys-color-tertiary', p.chip],
    ['md-sys-color-on-tertiary', p.onChip],
    ['md-sys-color-tertiary-container', p.chip],
    ['md-sys-color-on-tertiary-container', p.onChip],
    ['md-sys-color-error', p.error],
    ['md-sys-color-on-error', p.onError],
    ['md-sys-color-error-container', p.errorContainer],
    ['md-sys-color-on-error-container', p.onErrorContainer],
  ];
  for (const k of ['read', 'write', 'admin']) {
    const K = k[0].toUpperCase() + k.slice(1);
    v.push(
      [`md-custom-color-${k}`, p[k]],
      [`md-custom-color-${k}-container`, p[`${k}Container`]],
      [`md-custom-color-on-${k}-container`, p[`on${K}Container`]],
      [`md-custom-color-${k}-fill`, p[`${k}Fill`]],
    );
  }
  return v.map(([n, c]) => `  --${n}: ${c};`);
}

const light = roles(LIGHT, false).join('\n');
const dark = roles(DARK, true).join('\n');

const css = `/* GENERATED by scripts/gen-theme.ts from the Cloud Console palette (docs/console-reference.md). Do not edit by hand. */

:root {
  color-scheme: light dark;
${light}
}

@media (prefers-color-scheme: dark) {
  :root {
${dark.replace(/^/gm, '  ')}
  }
}

:root[data-theme='light'] {
  color-scheme: light;
${light}
}

:root[data-theme='dark'] {
  color-scheme: dark;
${dark}
}
`;

const out = fileURLToPath(new URL('../src/ui/theme/tokens.css', import.meta.url));
writeFileSync(out, css);
console.log(`wrote ${out}`);
