# Release checklist: IAM Lens v1.0.0

Ticked = done and verified by the agent on 2026-11-22. **Pending** = an owner step that cannot be done by an agent; the ticket that completes it is named.

## Build and test (all green on 2026-11-22)

- [x] Version 1.0.0 in `package.json` and `package-lock.json`; `CHANGELOG.md` written.
- [x] Typecheck: `npm run typecheck`
- [x] Lint: `npm run lint`
- [x] Unit: `npm test` (29 files, 226 tests passed)
- [x] E2E incl. a11y (axe on every screen, light and dark) and perf (cold panel, keystroke): `npm run e2e` (57 passed)
- [x] Bundle budgets: `npm run check:bundle`
- [x] Build and zip: `npm run build && npm run zip` gives `.output/iam-lens-1.0.0-chrome.zip` (949,669 bytes, 927 KiB)
- [x] Zip variant without `key`: `npm run zip:store` gives `.output-store/iam-lens-1.0.0-chrome.zip` (see "The `key` question")

Full command: `npm run typecheck && npm run lint && npm test && npm run build && npm run e2e && npm run check:bundle && npm run zip`

## Manifest review (unzipped `.output/iam-lens-1.0.0-chrome.zip`)

- [x] `permissions`: `sidePanel`, `storage`, `unlimitedStorage`, `alarms`, `contextMenus` (no host permissions, no `tabs`, no `activeTab`)
- [x] `optional_permissions`: `identity` (requested only when the user clicks Sign in)
- [x] `optional_host_permissions`: `https://*.googleapis.com/` (same moment)
- [x] `key` present (pins ID `nkkmmkcohkjacpgiaiiadjmhcbmhgaen`).
- [x] Top-level `oauth2` block present (IAM-58): sign-in uses `identity.getAuthToken` with the Chrome Extension OAuth client `609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb`, and `wxt.config.ts` writes `oauth2.client_id` and both scopes into the manifest. `identity` stays an optional permission. Verify after `npm run zip` / `npm run zip:store` that the manifest in each zip contains `oauth2` (and `key` only in the non-store zip).
- [x] No remote code: no `<script src="http...">`, no `eval`/`new Function`, no custom `content_security_policy`. The only network fetches are JSON data (roles snapshot) and Google API GETs, never executed.

## Store and Google steps

- [ ] **Pending (IAM-51)** Privacy policy live on the custom domain. Page is `site/privacy.html` (updated for auto-sync, IAM-49); needs DNS/HTTPS on the domain (IAM-47, IAM-51).
- [x] Listing assets ready: copy in `docs/store-listing.md`; screenshots, promo tile and marquee in `docs/store-assets/` (IAM-26, IAM-37). Re-check once the final homepage and privacy URLs are known.
- [ ] **Pending (IAM-53)** Extension ID matches the store item. Compare the ID in the Developer Dashboard with `nkkmmkcohkjacpgiaiiadjmhcbmhgaen`.
- [ ] **Pending (IAM-57)** OAuth verification submitted (also needs IAM-46, IAM-54, IAM-55). Text is in `docs/oauth-verification.md`.
- [ ] **Pending (IAM-56)** Chrome Web Store listing submitted for review.

## The `key` question: does the Web Store accept `key` on first upload?

Finding: not documented either way, and there is a credible report that it is rejected.

- Chrome's docs ([Manifest - key](https://developer.chrome.com/docs/extensions/reference/manifest/key)) describe the opposite direction only: upload a zip once without publishing, read the public key from the dashboard Package tab, and put it into the manifest for local builds so IDs match. They never say the upload itself may contain `key`.
- A chromium-extensions thread ([Keeping a consistent extension ID without key in manifest v3](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/Su50pbNzRms)) reports the store rejecting a first upload with "key field not allowed in manifest"; a Chrome developer advocate recommended stripping `key` at upload time in the build. This is a community report, not official policy, and it is unverified here (agents cannot upload).
- The same thread notes that a store item without `key` gets a store-assigned ID, which differs from the ID derived from a locally generated key. Our pinned ID `nkkm...` came from a locally generated key (IAM-6), so a keyless first upload may produce a different ID.

Plan (decided in IAM-53, not here):

1. Try `.output/iam-lens-1.0.0-chrome.zip` (with `key`) as a draft upload. If accepted, the ID should match the pinned one and nothing else is needed.
2. If rejected, upload `.output-store/iam-lens-1.0.0-chrome.zip` (from `npm run zip:store`, identical except no `key`). The store assigns an ID. Then either (a) in the dashboard open Package and View public key, and use that key and the new ID everywhere (manifest `key` for dev builds, Google OAuth client "Application ID"/extension ID, `docs/oauth-verification.md`), or (b) try the documented alternative of uploading the zip with the matching `key.pem`, which may preserve the pinned ID.
3. The Chrome Extension OAuth client is bound to the extension's Item ID, so any ID change must be mirrored in the Google Cloud OAuth client (Item ID field) before sign-in works for store users. There is no redirect URI to update.

## Handing off to the owner: upload and submit

Agents don't upload, log in or submit. Steps for you (with the SM):

1. Register as a Chrome Web Store developer if not done (one-time fee) and verify the contact email (IAM-53).
2. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), choose **Add new item**, upload `.output/iam-lens-1.0.0-chrome.zip` (or the `zip:store` variant if the upload is rejected for `key`; see above). Do not publish yet.
3. Check the Item ID against `nkkmmkcohkjacpgiaiiadjmhcbmhgaen` (Package tab, View public key). If it differs, follow step 2 of the plan above and tell the SM.
4. Fill Store listing from `docs/store-listing.md`, upload the images from `docs/store-assets/`, set the privacy policy URL (the live custom-domain page), then the Privacy practices tab (single purpose, permission justifications, data-use disclosures, Limited Use certification) from the same doc.
5. Complete OAuth verification first or in parallel (IAM-54, IAM-55, IAM-57); the store reviewer may check that sign-in works.
6. Click **Submit for review** (IAM-56). Choose staged/deferred publishing if you want to release manually after approval.
