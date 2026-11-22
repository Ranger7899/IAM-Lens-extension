# OAuth verification: IAM Lens

Placeholders: `<CONTACT_EMAIL>`, `<DEVELOPER_NAME>`, `<PRIVACY_POLICY_URL>`, `<EXTENSION_ID>`.

## App information

- App name: IAM Lens
- Type: Chrome extension OAuth client, ID `<EXTENSION_ID>` (pinned via manifest key)
- Privacy policy: `<PRIVACY_POLICY_URL>` (source: `site/privacy.html`)
- Support contact: `<CONTACT_EMAIL>`
- Sign-in is optional. The core app works without any Google account.

## Scopes requested

1. `https://www.googleapis.com/auth/iam` (Google's consent screen shows this as "Manage your IAM policies").
2. `https://www.googleapis.com/auth/cloud-platform.read-only`.

Requested together, space-separated. Nothing else.

## Why `iam`, and why there is no read-only alternative

Google's API reference for [`projects.roles.list`](https://cloud.google.com/iam/docs/reference/rest/v1/projects.roles/list) and [`organizations.roles.list`](https://cloud.google.com/iam/docs/reference/rest/v1/organizations.roles/list) lists the accepted OAuth scopes as only `https://www.googleapis.com/auth/iam` and `https://www.googleapis.com/auth/cloud-platform`. `cloud-platform.read-only` is not accepted: calls made with it fail with 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT`. There is no read-only IAM scope, so `iam` is the narrowest scope that lets the extension list custom roles. `cloud-platform` is broader than `iam`, so it was not chosen.

`cloud-platform.read-only` is requested for the Cloud Resource Manager calls (`projects.search`, `organizations.search`), which accept it, so the user can pick which project or organisation to read.

The extension only ever calls `roles.list` (GET) and the two search methods (GET). It never calls any method that changes IAM policies, roles or resources. The code is public: `src/core/gcp/iam.ts`.

## Scope justification (paste)

IAM Lens lets a Google Cloud user look up which IAM roles grant a permission and which permissions a role contains. Predefined roles come from a bundled public snapshot. To also show the user's own custom roles, the extension lists them with the IAM API (`roles.list` for an organisation or project), which Google restricts to the `https://www.googleapis.com/auth/iam` or `https://www.googleapis.com/auth/cloud-platform` scope; no read-only scope is accepted by that method, so we request the narrower of the two, `iam`. The extension also requests `https://www.googleapis.com/auth/cloud-platform.read-only` for the Cloud Resource Manager API (`projects.search`, `organizations.search`), to let the user choose which project or organisation to read. Although `iam` is described as "Manage your IAM policies", the extension only issues read (GET) requests for role definitions (list and get). It never creates, modifies or deletes any resource or policy and never reads resource data, only role definitions and project names/IDs. The OAuth token is used only in the user's browser, is never sent to the developer or any third party, and custom-role data is stored locally only and deleted on sign-out. Use of Google user data adheres to the Google API Services User Data Policy, including Limited Use requirements.

## API calls made with the token

| API | Method | Why |
| --- | --- | --- |
| IAM `roles.list` | GET `/v1/roles` (custom roles, per parent) | Load custom roles |
| Cloud Resource Manager `projects.search` / organizations search | GET | Let the user pick a project or organisation |

## Demo video script (unlisted YouTube, about 3 minutes, English narration or captions)

1. (0:00) Show the extension in the Chrome Web Store listing or `chrome://extensions` with the ID `<EXTENSION_ID>`. State the single purpose.
2. (0:15) Without signing in: open the side panel, search `storage.objects.get`, open `roles/viewer`. Show that predefined roles work offline and with no sign-in.
3. (0:45) Open Settings and show the privacy note and the "Sign in" button. Show the privacy policy URL.
4. (1:00) Click "Sign in". Show the full browser address bar or the Google account chooser, then the OAuth consent screen with the app name, the developer, and the requested scope clearly readable. Zoom on the scope lines ("Manage your IAM policies" and the read-only Cloud Platform line) and say aloud that the extension only reads role definitions. Approve.
5. (1:30) Show the project picker populated from Cloud Resource Manager. Select a project.
6. (1:50) Show a custom role appearing with a "Custom" badge and its permissions. Mention that only read requests are made (optionally show the Network panel of the extension's service worker with GET requests to `iam.googleapis.com` and `cloudresourcemanager.googleapis.com`).
7. (2:20) Click "Sign out". Show the custom roles disappearing, and state that the token was revoked and local data deleted. Optionally show DevTools, Application, IndexedDB with the custom-role store empty.
8. (2:45) Close by stating: no analytics, no remote code, data stays local, Limited Use compliance.

Recording tips: use a throwaway Google Cloud project and a test account, hide personal info and real project names, 1080p, show the URL bar during consent.
