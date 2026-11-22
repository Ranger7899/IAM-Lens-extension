# Contributing to IAM Lens

Thanks for helping. IAM Lens is a Chrome MV3 extension for two-way Google Cloud IAM lookup (permission to roles, role to permissions). It is private by design: please do not add network calls, telemetry or new permissions without discussing it in an issue first.

## Setup

Requirements: Node.js (current LTS) and npm.

```sh
git clone git@github.com:Ranger7899/IAM-Lens-extension.git
cd IAM-Lens-extension
npm install
npm run dev      # WXT dev server, opens Chrome with the extension
```

To load a production build: `npm run build`, then `chrome://extensions` > Developer mode > Load unpacked > `.output/chrome-mv3`.

## Tests and checks

```sh
npm test            # unit tests (Vitest)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run e2e         # Playwright (run `npm run build` and `npx playwright install chromium` first)
npm run format      # Prettier
```

Run `npm test`, `npm run lint` and `npm run typecheck` before opening a PR. CI runs them too.

## Code style

- TypeScript in strict mode; avoid `any` and non-null assertions.
- ESLint (flat config) and Prettier are the source of truth; do not hand-format.
- UI follows the design guidelines in [docs/design.md](docs/design.md). Generated files such as `src/ui/theme/tokens.css` come from scripts (`npm run gen:theme`); edit the generator, not the output.
- The data snapshot pipeline is described in [docs/snapshot-pipeline.md](docs/snapshot-pipeline.md).

## Commit convention

Maintainers use `[IAM-N][Type] summary`, where Type is one of Feature, Fix, Chore, Refactor, Docs, Test, Perf, Build, CI, Revert. Example: `[IAM-12][Fix] Handle empty permission search`.

Outside contributors: a plain imperative summary is fine (for example `Fix empty search state`). A maintainer will adjust it when merging.

## Pull request checklist

- [ ] The change is focused and described in the PR.
- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass.
- [ ] New behaviour has tests; UI changes include a screenshot.
- [ ] UI changes follow `docs/design.md` and keep accessibility (keyboard, contrast, labels).
- [ ] No new permissions, network requests or third-party code without prior discussion.
- [ ] Docs and `CHANGELOG.md` are updated if user-visible behaviour changed.

## Reporting problems

Bugs and feature ideas: use the issue templates. Security issues: do not open a public issue; see [SECURITY.md](SECURITY.md).

By contributing you agree your work is released under the project's MIT licence, and you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
