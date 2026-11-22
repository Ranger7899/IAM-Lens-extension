# Article outline: IAM Lens (epic IAM-60, ticket IAM-66)

Venue: Google Cloud Community publication on Medium. Audience: Google Cloud engineers, platform and security people.

## Angle

"Privacy as an architecture decision, not a policy." The extension answers "which role grants X?" instantly and offline because the whole predefined-role catalogue ships inside it (about 2 MB). The only network use is optional sign-in for custom roles, and that path is read-only GETs straight from the browser to Google, with no backend of mine in between. The story arc: a small annoyance, a design that removes the need for a server, and what Google's OAuth verification taught me about the cost of even one sensitive scope.

Not the angle: a product launch post, or a Chrome-extension tutorial.

## Title options

1. How I built a GCP IAM lookup extension that never sends your data anywhere (required option, working title)
2. Which role grants this permission? Answering it in under 20 ms, offline
3. 2,437 roles, 14,389 permissions, zero backend: building IAM Lens
4. Least privilege without leaving the tab: a Chrome extension for GCP IAM
5. No server, no keys: a nightly IAM snapshot, Workload Identity Federation and an extension that reads it

## Hook (one paragraph, draft)

Every GCP engineer has asked "which role grants `compute.instances.setMetadata`?" and then lost five minutes to it. The IAM docs have a roles reference, but it is a long page per service and the permission-to-role direction is awkward. `gcloud iam roles list` plus grep works, but it is slow and needs a login. Policy Troubleshooter and the Console's role picker answer "why was this denied?" for a specific principal and resource, not "what is the smallest role that covers these ten permissions?". I wanted a search box that answered both directions instantly, worked on a plane, and did not ask me to trust yet another server with my project list. So I built one.

## Sections (target about 1,500-2,000 words total)

1. **The problem** (~200 words)
   - The two directions: permission to roles, role to permissions; where docs, `gcloud` and Policy Troubleshooter each fall short.
   - Least privilege in practice: people grant `roles/editor` because finding the right narrow role is tedious.
   - Why a browser extension: the lookup happens next to the Console tab or the Terraform diff.
2. **Design goals: instant, offline, private** (~200 words)
   - Instant: budgets of 150 ms to interactive and 16 ms per keystroke, enforced in an e2e test.
   - Offline: the catalogue is bundled, so it works with no network and no sign-in.
   - Private: no analytics, no backend; sign-in is optional and only for your own custom roles.
   - Cost of the goals: a 2 MB data file in the bundle, and a refresh path that does not need a server of mine.
3. **The data: a nightly snapshot with Workload Identity Federation** (~300 words)
   - A GitHub Actions cron (03:17 UTC) calls `roles.list?view=FULL` for all predefined roles and writes `roles.snapshot.json` plus `manifest.json`.
   - Auth is Workload Identity Federation: GitHub's OIDC token is exchanged for a service-account token; no keys exist. Hardening: numeric repository and owner IDs and a `refs/heads/main` condition in the provider, and the service account has no project roles.
   - Interned format: permission strings stored once, sorted; roles hold index lists. Version = first 12 hex of SHA-256 of canonical content, so no data change means no diff and no deploy.
   - Size story: about 2.07 MB raw, about 0.47 MB gzipped, 2,437 roles, 14,389 permissions. The extension fetches the manifest daily and only downloads the snapshot when the version changed. "What's new" is a diff of two snapshots.
4. **Search and least privilege** (~300 words)
   - MiniSearch for fuzzy full-text over roles and permissions; roles stored as sorted `Int32Array`s with a CSR permission-to-roles inverted index (`src/core/model.ts`).
   - Ranking choices: same-service-first, demote service-agent, BETA, legacy and deprecated roles.
   - Minimal-role finder: greedy weighted set cover, score = newly covered / (permission count + 10); tiers so service-agent and deprecated roles are only fallbacks; a pruning pass removes redundant picks (`src/core/leastPrivilege.ts`). Honest caveat: greedy is an approximation, not optimal.
   - A short worked example with real output (pick one while drafting).
5. **Custom roles without a backend** (~250 words)
   - `chrome.identity.getAuthToken` with a Chrome Extension OAuth client: no redirect URI, no client secret, the Chrome profile's account; sign-out revokes the token.
   - Only GET requests: `roles.list` on organizations and projects, plus project discovery via Resource Manager.
   - Auto-sync: discover every accessible project and organization after one sign-in, refresh when older than an hour on opening the panel, then hourly.
   - Storage: custom roles stay in local IndexedDB in the browser, merged into the same index with a "Custom" badge. Nothing is uploaded.
   - Why not a backend: a backend would have to hold your tokens or your role data; leaving it out removes the question.
6. **Getting verified by Google** (~250 words)
   - Scopes: `auth/iam` is the only accepted non-`cloud-platform` scope for custom `roles.list`; there is no read-only IAM scope. `cloud-platform.read-only` is added only for project discovery. Calls with `cloud-platform.read-only` alone to `roles.list` return 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT`.
   - Branding requirements: homepage on a domain you own and verify in Search Console (a GitHub Pages `github.io` host is likely rejected), privacy policy on the same domain, demo video showing the whole consent flow.
   - The `launchWebAuthFlow` to `getAuthToken` switch: the `chromiumapp.org` redirect domain cannot be verified, so I moved to a Chrome Extension client type.
   - Timelines from Google: about 10 business days for sensitive scopes, 2-3 days for brand. Update this section with the real outcome before publishing (see follow-ups).
7. **Lessons learned** (~200 words)
   - Ship the data, not a server: removes whole classes of ops, privacy and cost problems.
   - Content-hash versions make a daily cron safe and quiet.
   - Budgets in CI and in e2e tests keep "instant" true over time.
   - Scope minimisation is a product decision as much as a compliance one.
   - Ranking quality (demoting service agents and legacy roles) mattered more than search speed.
8. **Try it / contribute** (~100 words)
   - Link to the site `https://iamlens.vaultline.cloud/`, the Chrome Web Store listing (add once live), and the GitHub repo.
   - Invite issues: missing roles, wrong ranking, ideas for the minimal-role finder.

## Target length and tone

- 1,500-2,000 words, 8-10 minute read.
- First person, practical, no hype. Short paragraphs; code and numbers carry the argument. Admit limits (greedy cover, Chrome only, sign-in not yet verified if still pending). No emojis, no "game-changer" language.

## Facts sheet (all numbers from the repo, 2026-11-22)

| Fact | Value | Source |
|---|---|---|
| Predefined roles in snapshot | 2,437 | `data/manifest.json` (`roleCount`) |
| Distinct permissions | 14,389 | `data/manifest.json` (`permissionCount`) |
| Snapshot size, raw | 2,066,035 bytes (about 2.0 MB; 2,017.6 KB as built into the bundle) | `data/manifest.json` (`bytes`); `node scripts/check-bundle.ts` output |
| Snapshot size, gzipped | 466,450 bytes (about 0.47 MB) | `gzip -c data/roles.snapshot.json \| wc -c`; matches `docs/snapshot-pipeline.md` |
| Snapshot version / generated | `fdce9a1321fa`, 2026-11-21T20:02:37Z | `data/manifest.json` |
| Version scheme | first 12 hex of SHA-256 of canonical content, `generatedAt` excluded | `docs/snapshot-pipeline.md`; `scripts/build-snapshot.ts` (`canonicalContent`) |
| Snapshot schedule | daily, cron `17 3 * * *` (UTC) | `.github/workflows/snapshot.yml` |
| Snapshot API call | `GET iam.googleapis.com/v1/roles?view=FULL&pageSize=1000` | `docs/snapshot-pipeline.md` |
| Pipeline auth | Workload Identity Federation, no keys; impersonation limited to one numeric repository ID, provider condition on owner ID and `refs/heads/main`; SA has no project roles | `docs/snapshot-pipeline.md` (Current deployment); `.github/workflows/snapshot.yml` |
| Extension bundle, excl. snapshot | 1,080.4 KB (budget 1,536 KB = 1.5 MB) | `node scripts/check-bundle.ts` run on `.output/chrome-mv3`; budget in `scripts/check-bundle.ts` |
| Largest single JS chunk budget | 400 KB per chunk; CSP must not allow remote script-src | `scripts/check-bundle.ts` |
| Store zip size | 927.4 KB | `.output/iam-lens-1.0.0-chrome.zip` (`ls`) |
| Unit tests | 229 passing | `npx vitest run` |
| E2E tests | 57 passing in the full Playwright run (default suite; screenshot/store specs are gated off) | `npx playwright test`, run 2026-11-22 (IAM-58 review) |
| Perf: panel ready (cold and warm, p50) | budget 150 ms, enforced at 1.25x slack (187.5 ms) | `e2e/perf.spec.ts` (`TTI_BUDGET_MS`, `SLACK`) |
| Perf: keystroke render p95 | budget 16 ms, enforced at 1.5x slack (24 ms) | `e2e/perf.spec.ts` (`KEYSTROKE_BUDGET_MS`, `KEYSTROKE_SLACK`) |
| Perf: sampling | 5 runs per measurement, 20 keystroke samples; budgets enforced locally, reported only on shared CI | `e2e/perf.spec.ts` |
| Measured cold panel | "about 120 ms" | `CHANGELOG.md` 1.0.0 (IAM-25); re-run `npm run e2e` before quoting |
| Search library | MiniSearch ^7.2.0 | `package.json`; `src/core/model.ts` |
| Role storage | sorted `Int32Array` of permission indices; CSR permission-to-roles inverted index | `src/core/model.ts` (header comment) |
| Set cover | greedy weighted; score = newly covered / (permission count + `ROLE_OVERHEAD`=10) | `src/core/leastPrivilege.ts` |
| Auth method | `chrome.identity.getAuthToken`, Chrome Extension OAuth client, Chrome only | `CHANGELOG.md` (IAM-58); `docs/oauth-verification.md` |
| OAuth scopes | `auth/iam` and `auth/cloud-platform.read-only`; all calls GET | `docs/oauth-verification.md`; `CHANGELOG.md` (IAM-41) |
| Why `iam` scope | `roles.list` accepts only `iam` and `cloud-platform`; no read-only IAM scope | `docs/oauth-verification.md` |
| Auto-sync cadence | on side-panel open if older than 1 hour, then hourly, on demand | `CHANGELOG.md` (IAM-44, IAM-18); `src/ui/data/useCustomSync.ts` |
| Token lifetime assumption | about 1 hour | `src/core/gcp/authConfig.ts` |
| Verification timing | about 10 business days (sensitive scope), 2-3 days (brand) | `docs/verification-plan.md` |
| Unverified-app cap | 100 new users, lifetime | `docs/verification-plan.md` |
| Version | 1.0.0, 2026-11-22 | `package.json`; `CHANGELOG.md` |
| Site | `https://iamlens.vaultline.cloud/` (privacy.html, terms.html) | `docs/oauth-verification.md`; `docs/snapshot-pipeline.md` |
| Repo | `Ranger7899/IAM-Lens-extension` | `git remote -v` |

Notes for the drafter: `docs/snapshot-pipeline.md` rounds to "~2400 roles, ~14k permissions"; use the manifest's exact numbers and re-read `data/manifest.json` just before publishing because the snapshot changes nightly.

## Visuals (4-6, feeds IAM-68)

1. Architecture diagram: GitHub Actions (cron) -> OIDC -> Workload Identity Federation -> service account -> `roles.list` -> `data/` -> GitHub Pages (`iamlens.vaultline.cloud`) -> extension (bundled snapshot + daily manifest check) ; second branch: Chrome `getAuthToken` -> Google APIs (GET only) -> IndexedDB. Show where no server of mine exists.
2. GIF of search: type a permission, roles appear smallest first with the Least-privilege badge; then a role search (keep under 10 s, under 2 MB).
3. Screenshot: Minimal-role finder with pasted permissions and the chosen roles (light theme).
4. Screenshot: the options-page trust sheet before sign-in, plus a custom role with its "Custom" badge.
5. Code snippet: the greedy score line and tiers from `src/core/leastPrivilege.ts`, trimmed to about 12 lines.
6. Optional: a small table or chart of snapshot size (raw vs gzipped) and the bundle budget (1,080 KB of 1,536 KB).

Existing assets to reuse: `docs/screens/` and `docs/store-assets/`.

## Open questions and follow-ups

- Verification outcome: the article's section 6 depends on the status of the OAuth verification (IAM-57) and Chrome Web Store review (IAM-56). Publish after approval, or write it as "in progress".
- Add the Web Store link once the listing is live.
- Re-run `npm run e2e` and record the real cold-panel and keystroke numbers (CHANGELOG says about 120 ms) before quoting measured latency.
- Decide whether to name the repository owner and developer in the byline.
- Pick one real worked example for the minimal-role finder (section 4) and verify the output against the current snapshot.
