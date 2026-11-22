# OAuth verification: IAM Lens

Placeholders: `<DEVELOPER_NAME>`, `<HOMEPAGE_URL>`, `<PRIVACY_POLICY_URL>`, `<TERMS_URL>`, `<AUTHORIZED_DOMAIN>`, `<EXTENSION_ID>`. The URLs and domain depend on where the site is hosted (github.io or a custom domain) and are filled in by the owner. The publishing status shown in Google Auth Platform is "Testing" until the app is published to "In production".

## App information

- App name: IAM Lens
- Type: "Chrome Extension" OAuth client (client ID `609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb.apps.googleusercontent.com`), Item ID `<EXTENSION_ID>` (pinned via manifest key). It has no redirect URIs and no client secret. `chromiumapp.org` is not an authorized domain and is not needed: sign-in uses `chrome.identity.getAuthToken`, and the client ID is in the manifest `oauth2` block.
- Sign-in works in Google Chrome only, with the Google account signed in to the Chrome profile (no account picker).
- Homepage: `<HOMEPAGE_URL>`
- Privacy policy: `<PRIVACY_POLICY_URL>`
- Terms of service: `<TERMS_URL>`
- Support contact: ysfmasad@gmail.com
- Sign-in is optional. The core app works without any Google account.

## Consent-screen fields (Google Auth Platform, Branding and Data Access)

| Field | Value |
| --- | --- |
| App name | IAM Lens |
| User support email | ysfmasad@gmail.com |
| App logo | `scripts/brand/consent-logo-120.png` (120x120 PNG, under 1 MB; regenerate with `npm run gen:consent-logo`) |
| Application home page | `<HOMEPAGE_URL>` |
| Application privacy policy link | `<PRIVACY_POLICY_URL>` |
| Application terms of service link | `<TERMS_URL>` |
| Authorized domains | `<AUTHORIZED_DOMAIN>` (the domain that hosts the homepage, privacy policy and terms links) |
| Developer contact information | ysfmasad@gmail.com |
| Scopes (Data Access) | `https://www.googleapis.com/auth/iam` and `https://www.googleapis.com/auth/cloud-platform.read-only` (add both) |
| Publishing status | Testing until verification passes, then In production |

## Scopes requested

1. `https://www.googleapis.com/auth/iam` (Google's consent screen shows this as "Manage your IAM policies").
2. `https://www.googleapis.com/auth/cloud-platform.read-only`.

Requested together, space-separated. Nothing else.

## Why `iam`, and why there is no read-only alternative

Google's API reference for [`projects.roles.list`](https://cloud.google.com/iam/docs/reference/rest/v1/projects.roles/list) and [`organizations.roles.list`](https://cloud.google.com/iam/docs/reference/rest/v1/organizations.roles/list) lists the accepted OAuth scopes as only `https://www.googleapis.com/auth/iam` and `https://www.googleapis.com/auth/cloud-platform`. `cloud-platform.read-only` is not accepted: calls made with it fail with 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT`. There is no read-only IAM scope, so `iam` is the narrowest scope that lets the extension list custom roles. `cloud-platform` is broader than `iam`, so it was not chosen.

`cloud-platform.read-only` is requested for the Cloud Resource Manager calls (`projects.search`, `organizations.search`), which accept it, so the extension can discover every project and organisation the signed-in account can access.

The extension only ever calls `roles.list` (GET) and the two search methods (GET), through `src/core/gcp/http.ts`, which only issues GET requests. It never calls any method that changes IAM policies, roles or resources. The code is public: `src/core/gcp/iam.ts`, `src/core/gcp/crm.ts`, `src/ui/data/customSync.ts`.

## Scope justification (paste)

IAM Lens lets a Google Cloud user look up which IAM roles grant a permission and which permissions a role contains. Predefined roles come from a bundled public snapshot. To also show the user's own custom roles, the extension uses the Cloud Resource Manager API (`projects.search` and `organizations.search`) to automatically discover all projects and organizations the signed-in account can access, then reads each one's custom roles with the IAM API (`roles.list`). The search calls are covered by `https://www.googleapis.com/auth/cloud-platform.read-only`. `roles.list` is restricted by Google to `https://www.googleapis.com/auth/iam` or `https://www.googleapis.com/auth/cloud-platform`; no read-only scope is accepted by that method, so we request the narrower of the two, `iam`. Although `iam` is described as "Manage your IAM policies", the extension only issues read-only GET requests. It never creates, modifies or deletes any resource, role or policy and never reads resource data: only role definitions and the display names and IDs of the projects and organizations. The data is refreshed automatically: when the side panel opens and the last sync is more than one hour old, then once an hour while the panel stays open, and on demand with the refresh button (Search page) or "Sync now" (Settings). The OAuth token lives only in the browser session, is never sent to the developer or any third party, and the fetched role definitions and source names are stored locally only. Signing out revokes the token and deletes them. Use of Google user data adheres to the Google API Services User Data Policy, including Limited Use requirements.

## API calls made with the token

All calls are HTTP GET, made from the extension in the user's browser, with pagination (`pageSize` 500 for search, 1000 for roles).

| API | Request | Scope | Why |
| --- | --- | --- | --- |
| Cloud Resource Manager v3 `projects.search` | GET `cloudresourcemanager.googleapis.com/v3/projects:search` | `cloud-platform.read-only` | Discover every accessible project (ID and display name) |
| Cloud Resource Manager v3 `organizations.search` | GET `cloudresourcemanager.googleapis.com/v3/organizations:search` | `cloud-platform.read-only` | Discover every accessible organization (a 403/404 just means none) |
| IAM v1 `roles.list` (projects) | GET `iam.googleapis.com/v1/projects/<id>/roles?view=FULL&showDeleted=false` | `iam` | Read the custom roles of each project |
| IAM v1 `roles.list` (organizations) | GET `iam.googleapis.com/v1/organizations/<id>/roles?view=FULL&showDeleted=false` | `iam` | Read the custom roles of each organization |

Sync behaviour: runs when the side panel opens if the last sync is over 1 hour old, then every hour while the panel is open, and on demand (refresh button, "Sync now"). Up to 4 sources are fetched at once. A source the account cannot read (403/404) is skipped and counted as "no access". Roles of sources that are no longer accessible are removed. Chrome caches the `getAuthToken` token itself; the extension keeps only a session marker. Sign-out calls `removeCachedAuthToken`, revokes the token at `oauth2.googleapis.com/revoke` and clears Chrome's cached tokens.

## Demo video script (unlisted YouTube, about 3 minutes, English narration or captions)

1. (0:00-0:30) No-sign-in lookup. Show the extension in `chrome://extensions` (ID `<EXTENSION_ID>`) and state the single purpose. Open the side panel, search `storage.objects.get`, open `roles/viewer`. Say that predefined roles work with no sign-in.
2. (0:30-1:05) Settings, Sign in. Open Settings (options page), show the Custom roles card and the privacy note, click "Sign in". `getAuthToken` opens Google's consent window without an editable address bar. Google requires the OAuth client ID to be visible, so show it two ways: open `chrome://extensions`, enable Developer mode, open the extension's manifest (or `chrome-extension://<EXTENSION_ID>/manifest.json`) and pause on `oauth2.client_id`; and, if the consent window shows its URL, pause on `client_id=` there as well.
3. (1:05-1:40) Consent screen. Show the app name "IAM Lens", the developer contact, and both scope lines ("Manage your IAM policies" and the read-only Cloud Platform line) readable. Zoom on them, say aloud that the extension only issues read (GET) requests for role definitions and project names. Approve.
4. (1:40-2:05) Auto-sync status row. Open the side panel Search page and show the status row: "Custom roles · N from X projects and Y organizations · synced just now". Say that all accessible projects and organizations are found automatically, with nothing to choose or configure, and that it re-syncs hourly while the panel is open.
5. (2:05-2:25) Custom role. Search for a custom role and show its badge "Custom · <project> (project)" and its permissions.
6. (2:25-2:40) Refresh button. Click the refresh icon on the status row, show "Syncing…" then the updated "synced just now". Mention only GET requests (optionally show the service-worker Network panel with GETs to `iam.googleapis.com` and `cloudresourcemanager.googleapis.com`).
7. (2:40-3:00) Sign out and clear. In Settings click "Sign out & clear", confirm, show the custom roles and the status row disappearing, and state that the token was revoked and local data deleted. Close: no analytics, no remote code, data stays local, Limited Use compliance.

Recording tips: use a throwaway Google Cloud account with a few projects and at least one custom role, hide personal info and real project names, 1080p, show `oauth2.client_id` from the manifest (and `client_id=` in the consent window URL if visible). Sign in with a Google account that is signed in to the Chrome profile you are recording.
