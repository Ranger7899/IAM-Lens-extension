# Changelog

## 1.0.0 (2026-11-22)

First public release of IAM Lens: two-way Google Cloud IAM role and permission lookup.

### Lookup
- Search roles and permissions with highlighting and keyboard navigation (IAM-9).
- Role detail with a spectrum bar and permissions grouped by service (IAM-10).
- Permission detail lists granting roles smallest first, with a Least-privilege badge (IAM-11).
- Minimal-role finder: paste permissions, get the fewest and smallest roles (IAM-12).
- Compare two roles, with a three-way diff and swap (IAM-13).
- Same-service-first ranking; agent-like and BETA roles are demoted (IAM-30).
- Minimal and Compare tabs are optional, hidden by default, enabled in Settings (IAM-43).

### Data
- Bundled predefined-roles snapshot, refreshed daily from the public nightly snapshot (IAM-3, IAM-16, IAM-7).
- What's new: diff between the previous and current snapshot, now shown in Settings (IAM-14, IAM-39).

### Custom roles (optional sign-in)
- Sign in with Google through `launchWebAuthFlow`; token is kept in session storage only (IAM-19).
- Auto-sync: sign in once and every accessible project and organization is discovered and synced; refreshed on opening the side panel when older than an hour, then hourly, and on demand (IAM-44, IAM-18).
- Custom roles are merged into the index with "Custom" source badges on every screen (IAM-21).
- Requests the `iam` scope for `roles.list` (the only accepted non-cloud-platform scope) plus `cloud-platform.read-only` for project discovery; all calls are GET (IAM-41).
- Options page: trust sheet before sign-in, data status, sign out and clear (IAM-20).

### Entry points
- Popup quick search that hands off to the side panel (IAM-15).
- Omnibox keyword `iam` and context-menu lookups (IAM-17).

### Design and quality
- Cloud Console look: measured light and dark palettes, official Google Cloud service icons, console layouts (IAM-33, IAM-34, IAM-35, IAM-36).
- Shield lens icon and refreshed store assets (IAM-37, IAM-40).
- Fixes: single scrollbar on Minimal results (IAM-42), picker rows named by visible text for axe (IAM-32), contrast (IAM-28).
- Cold side panel ready in about 120 ms; perf and bundle budgets enforced (IAM-25, IAM-31).
- E2E suite with axe checks on every screen in light and dark, offline fallback and deep links (IAM-24); CI workflow (IAM-22).

### Release and compliance
- Privacy policy, terms and homepage under `site/` (IAM-23, IAM-48, IAM-49).
- Store listing copy and OAuth verification notes (IAM-23, IAM-52).
