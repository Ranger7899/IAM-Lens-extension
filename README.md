# IAM Lens

Two-way Google Cloud IAM lookup (permission to roles, role to permissions) as a Chrome MV3 extension with a popup, side panel and options page. Material 3 Expressive look; see `docs/design.md`.

Stack: WXT, TypeScript (strict), React 19, Vitest, ESLint (flat) + Prettier, Playwright.

## Develop

```sh
npm install
npm run dev        # WXT dev server, opens Chrome with the extension (HMR)
npm run build      # production build to .output/chrome-mv3
npm run zip        # Web Store zip
npm test           # unit tests (Vitest + WXT fake-browser)
npm run lint
npm run typecheck
npm run e2e        # Playwright; needs `npm run build` and `npx playwright install chromium` first
npm run gen:theme  # regenerate src/ui/theme/tokens.css (committed) from seed #1A73E8
```

Load unpacked: `chrome://extensions` > Developer mode > Load unpacked > `.output/chrome-mv3`.

## Layout

- `src/entrypoints/` background, popup, sidepanel, options
- `src/ui/theme/` generated colour tokens + type/shape/elevation/motion tokens
- `src/ui/components/` M3 components (CSS modules)
- `src/core/` data and search logic (later phases)

## Notes

- Fonts (Google Sans Flex, Google Sans Code; OFL) and Material Symbols (Apache-2.0) are bundled locally.
- `manifest.key` is intentionally unset: see the TODO in `wxt.config.ts` (Phase 0).
