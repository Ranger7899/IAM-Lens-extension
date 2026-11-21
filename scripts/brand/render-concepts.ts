// Renders the IAM-38 logo concepts: PNG previews, the comparison page and its full-page screenshot.
// Run: npx tsx scripts/brand/render-concepts.ts
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const dir = resolve(root, 'docs/brand/concepts')
mkdirSync(resolve(dir, 'png'), { recursive: true })

interface Concept {
  n: number
  slug: string
  name: string
  rationale: string
  strengths: string
  risks: string
}
const concepts: Concept[] = [
  { n: 1, slug: 'keyhole-lens', name: 'Keyhole lens',
    rationale: 'A solid lens disc with a keyhole cut out of it: the thing you look through is also the thing that grants access. One shape, one cut, one handle.',
    strengths: 'Strongest silhouette at 16 px. Instantly says "lookup" and "access".',
    risks: 'Closest cousin to the old lens-and-key icon; magnifier plus keyhole is a familiar security trope.' },
  { n: 2, slug: 'permission-anatomy', name: 'Permission anatomy',
    rationale: 'The product\'s signature token, service.resource.verb, drawn as three segments. The verb is lit in the privilege hue and underlined with the anatomy bracket.',
    strengths: 'Unmistakably ours; ties directly to the in-app token and to the risk palette.',
    risks: 'Wide, low shape leaves much of a square slot empty; reads as "a bar" until you know the token.' },
  { n: 3, slug: 'prism', name: 'Prism',
    rationale: 'A role is a prism: one beam goes in, and it fans out into read, write and admin. The only mark that carries the full risk palette as its idea.',
    strengths: 'Colourful, memorable, explains what a role does. Distinct from every other concept.',
    risks: 'Prism plus rainbow beam resembles well-known album-art imagery; three thin rays are fragile at 16 px.' },
  { n: 4, slug: 'shield-lens', name: 'Shield lens',
    rationale: 'A shield whose negative space is a magnifier: least privilege, inspected. The lens is carved out, so it takes the background colour on any surface.',
    strengths: 'Clear security meaning, compact and bold, works as a tile-less mark.',
    risks: 'Shields are the most common security icon; differentiation rests on the cut-out only.' },
  { n: 5, slug: 'two-way-link', name: 'Two-way link',
    rationale: 'A filled role node and a ring permission node joined by an L-shaped path with arrowheads at both ends: the role to permission lookup runs both ways.',
    strengths: 'Describes the two-way feature directly; the L hints at the Lens initial.',
    risks: 'Most diagram-like, so least "logo"; the arrowheads vanish at 16 px and leave nodes plus an elbow.' },
  { n: 6, slug: 'viewfinder-il', name: 'Viewfinder IL',
    rationale: 'Four camera-style corner brackets frame an I and an L cut from straight bars: inspecting IAM, with the initials as the subject.',
    strengths: 'Typographic and ownable; calm geometry; no security cliche.',
    risks: 'Needs the label to be understood; the glyphs are small inside the frame at 16 px.' },
]

const file = (c: Concept, suffix = '') => resolve(dir, `${c.n}-${c.slug}${suffix}.svg`)
const read = (p: string) => readFileSync(p, 'utf8').trim()
const variant = (c: Concept, size: 16 | 32) => (existsSync(file(c, `-${size}`)) ? file(c, `-${size}`) : file(c))

/** Make mask ids unique when the same SVG is inlined many times. */
let uid = 0
const inline = (svg: string, size: number) => {
  const u = `u${uid++}`
  return svg
    .replace(/id="([^"]+)"/g, `id="$1-${u}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1-${u})`)
    .replace(/ width="\d+" height="\d+"/, ` width="${size}" height="${size}"`)
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ deviceScaleFactor: 1 })
  const page = await ctx.newPage()

  // 1. PNG previews (transparent)
  const dataUri: Record<string, string> = {}
  for (const c of concepts) {
    for (const size of [16, 32, 128] as const) {
      const svg = read(size === 128 ? file(c) : variant(c, size))
      await page.setViewportSize({ width: size, height: size })
      await page.setContent(
        `<html><body style="margin:0;background:transparent">${inline(svg, size)}</body></html>`,
      )
      const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
      writeFileSync(resolve(dir, `png/${c.n}-${c.slug}-${size}.png`), buf)
      dataUri[`${c.n}-${size}`] = `data:image/png;base64,${buf.toString('base64')}`
    }
  }

  // 2. Comparison page
  const wm = (c: Concept, theme: 'light' | 'dark') => `
    <div class="lockup ${theme}">${inline(read(file(c)), 48)}<span class="wm">IAM Lens</span></div>`
  const ph = (kind: number) =>
    ['<i class="ph c"></i>', '<i class="ph s"></i>', '<i class="ph d"></i>'][kind]
  const toolbar = (c: Concept, theme: 'light' | 'dark') => `
    <div class="toolbar ${theme}">
      <span class="dots"><i></i><i></i><i></i></span>
      <span class="omni"></span>
      ${ph(0)}${ph(1)}<span class="us">${inline(read(variant(c, 16)), 16)}</span>${ph(2)}${ph(1)}
      <span class="kebab"></span>
    </div>`
  const sizes = (c: Concept, theme: 'light' | 'dark') => `
    <div class="tile sm ${theme}">
      <span class="r16">${inline(read(variant(c, 16)), 16)}</span>
      <span>${inline(read(variant(c, 32)), 32)}</span>
      <span>${inline(read(file(c)), 48)}</span>
      <em>16 / 32 / 48 px</em>
    </div>`
  const zoom = (c: Concept, theme: 'light' | 'dark') => `
    <div class="tile zoom ${theme}">
      <img src="${dataUri[`${c.n}-16`]}" width="64" height="64" alt="" />
      <img src="${dataUri[`${c.n}-32`]}" width="128" height="128" alt="" />
      <em>4x pixels, 16 / 32</em>
    </div>`

  const sections = concepts
    .map(
      (c) => `
  <section class="concept" id="c${c.n}">
    <header>
      <span class="num">${String(c.n).padStart(2, '0')}</span>
      <h2>${c.name}</h2>
      <p class="why">${c.rationale}</p>
      <dl><dt>Strengths</dt><dd>${c.strengths}</dd><dt>Risks</dt><dd>${c.risks}</dd></dl>
    </header>
    <div class="board">
      <div class="row">
        <div class="tile big light">${inline(read(file(c)), 128)}</div>
        <div class="tile big dark">${inline(read(file(c)), 128)}</div>
        <div class="stack">${sizes(c, 'light')}${sizes(c, 'dark')}</div>
      </div>
      <div class="row">${zoom(c, 'light')}${zoom(c, 'dark')}</div>
      <div class="row">${wm(c, 'light')}${wm(c, 'dark')}</div>
      <div class="row">${toolbar(c, 'light')}${toolbar(c, 'dark')}</div>
    </div>
  </section>`,
    )
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>IAM Lens: logo concepts</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--ink:#1b2e5d;--ink2:#475569;--paper:#f6f8fc;--rule:#d3dbec;--panel:#fff;--shell:#282c32;
 --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
 --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 var(--sans)}
main{max-width:1240px;margin:0 auto;padding:72px 40px 96px}
.top{border-bottom:1px solid var(--ink);padding-bottom:32px;margin-bottom:8px}
.top .kicker{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2)}
.top h1{font:400 46px/1.1 var(--serif);margin:12px 0 14px;letter-spacing:-.01em}
.top p{max-width:62ch;color:var(--ink2);margin:0}
nav{display:flex;gap:20px;flex-wrap:wrap;margin-top:22px;font-size:13px}
nav a{color:var(--ink);text-decoration:none;border-bottom:1px solid var(--rule)}
.concept{display:grid;grid-template-columns:300px 1fr;gap:48px;padding:56px 0;border-bottom:1px solid var(--rule)}
.concept header .num{font:400 15px var(--serif);font-style:italic;color:var(--ink2)}
.concept h2{font:400 32px/1.15 var(--serif);margin:6px 0 14px}
.why{margin:0 0 20px}
dl{margin:0;font-size:13.5px;color:var(--ink2)}
dt{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);margin-top:12px}
dd{margin:2px 0 0}
.board{display:flex;flex-direction:column;gap:20px;min-width:0}
.row{display:flex;gap:16px;flex-wrap:wrap}
.tile{border-radius:12px;border:1px solid var(--rule)}
.tile.light,.lockup.light,.toolbar.light{background:#fff}
.tile.dark,.lockup.dark,.toolbar.dark{background:#282c32;border-color:#282c32}
.tile.big{width:208px;height:208px;display:grid;place-items:center}
.stack{display:flex;flex-direction:column;gap:16px}
.tile.sm{width:208px;height:96px;display:flex;align-items:center;gap:20px;padding:0 20px;position:relative}
.tile.sm span{display:flex}
.tile em,.tile.zoom em{position:absolute;right:10px;bottom:6px;font:11px var(--sans);font-style:normal;color:#8a96ad}
.tile.zoom{width:260px;height:170px;display:flex;align-items:center;gap:20px;padding:0 20px;position:relative}
.tile.zoom img{image-rendering:pixelated;width:64px;height:64px}
.tile.zoom img+img{width:128px;height:128px}
.lockup{display:flex;align-items:center;gap:14px;padding:22px 28px;border-radius:12px;border:1px solid var(--rule);flex:1 1 300px}
.lockup .wm{font:600 30px/1 var(--sans);letter-spacing:-.01em}
.lockup.light .wm{color:#1b2e5d}.lockup.dark .wm{color:#f1f4f9}
.toolbar{display:flex;align-items:center;gap:14px;height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--rule);flex:1 1 300px}
.toolbar .dots{display:flex;gap:5px}.toolbar .dots i{width:8px;height:8px;border-radius:50%;background:#c3cad8}
.toolbar .omni{flex:1;height:26px;border-radius:13px;background:#e9eef6}
.toolbar.dark .omni{background:#414d5e}.toolbar.dark .dots i{background:#5b6677}
.toolbar .ph{display:block;width:16px;height:16px;background:#9ca6b2}
.toolbar .ph.c{border-radius:50%}.toolbar .ph.s{border-radius:3px}.toolbar .ph.d{border-radius:3px;transform:rotate(45deg) scale(.8)}
.toolbar.dark .ph{background:#7c8696}
.toolbar .us{display:flex}
.toolbar .kebab{width:3px;height:14px;background:radial-gradient(circle,#9ca6b2 1.4px,transparent 1.6px) 0 0/3px 5px}
.tile svg,.lockup svg{display:block}
.rank{padding:56px 0 0;color:var(--ink2);font-size:13px;max-width:70ch}
@media(max-width:980px){.concept{grid-template-columns:1fr;gap:24px}}
</style></head><body><main>
<div class="top"><span class="kicker">IAM-38 &middot; Brand exploration</span>
<h1>IAM Lens: six logo concepts</h1>
<p>Six original marks for a two-way GCP IAM lookup. Each is built on a 128 grid with the artwork inside the central 96, shown on light and dark, at real toolbar sizes, and as a 4x pixel preview. Colour comes from the product: console blue for the mark, read / write / admin hues only where the idea needs them.</p>
<nav>${concepts.map((c) => `<a href="#c${c.n}">${String(c.n).padStart(2, '0')} ${c.name}</a>`).join('')}</nav></div>
${sections}
<p class="rank">None of these uses a hexagon, a cloud, a letter G or a four-colour ring. The extension icon (public/icon) is unchanged until a concept is picked.</p>
</main></body></html>`
  writeFileSync(resolve(root, 'docs/brand/logo-concepts.html'), html)

  // 3. Full page screenshot
  const p2 = await browser.newPage({ viewport: { width: 1320, height: 900 } })
  await p2.goto('file://' + resolve(root, 'docs/brand/logo-concepts.html'))
  await p2.screenshot({ path: resolve(root, 'docs/brand/logo-concepts.png'), fullPage: true })
  await browser.close()
  console.log('done')
}
main()
