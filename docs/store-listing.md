# Chrome Web Store listing: IAM Lens

Ready to paste. Placeholders: `<CONTACT_EMAIL>`, `<DEVELOPER_NAME>`, `<PRIVACY_POLICY_URL>` (GitHub Pages URL of `site/privacy.html`).

## Name options (none starts with a Google trademark)

1. IAM Lens: role & permission lookup for Google Cloud (matches `wxt.config.ts`)
2. IAM Lens for Cloud
3. RoleLens: IAM roles & permissions finder

## Short description (max 132 characters)

```
Instantly find which Google Cloud IAM roles grant a permission, and which permissions a role has.
```

(97 characters; verified.)

## Category

Developer Tools

## Detailed description

IAM Lens is a fast two-way lookup for Google Cloud IAM.

- Paste a permission such as storage.objects.get and see every role that grants it, smallest role first, with a "Least privilege" hint.
- Open a role such as roles/run.invoker and browse all of its permissions, grouped by service.
- Every permission is colour-coded by privilege (read, write, admin) with icons as well as colour, and each role shows a read/write/admin spectrum bar.
- Find the smallest set of roles that covers a list of permissions, and compare two roles side by side.
- Search from the toolbar popup, the side panel, the address bar (type "iam" then a space) or by right-clicking selected text.
- Works offline on a bundled snapshot of predefined roles that refreshes automatically.
- Optional: sign in with Google to include your own organisation and project custom roles. They are stored only in your browser, and signing out deletes them.

Privacy: no analytics, no tracking, no remote code. Full policy: <PRIVACY_POLICY_URL>

IAM Lens is an independent project. Not affiliated with Google. Google Cloud and related icons are trademarks of Google LLC.

## Branding & trademarks

- Not affiliated with Google. Google Cloud and related icons are trademarks of Google LLC.
- Google Cloud service icons appear inside the extension only to identify the services a role or permission belongs to. They are not used as the extension's own logo or in its name.
- No Google or Google Cloud logo or wordmark appears in the icon, name or store images. The store screenshots show the extension's own UI.
- The same line is shown in the detailed description above, the options page About card and the footer of `site/privacy.html`.

## Single-purpose statement

IAM Lens has one purpose: to let users look up which Google Cloud IAM roles grant a permission and which permissions a role contains, using a bundled snapshot of predefined roles and, optionally, the user's own custom roles.

## Permission justifications

| Permission | Justification |
| --- | --- |
| `sidePanel` | Shows the full lookup interface (search, role detail, compare) in Chrome's side panel. |
| `storage` | Saves user settings (theme, selected project) locally. |
| `unlimitedStorage` | Stores the roles snapshot (about 2 MB, about 2,400 roles and 14,000 permissions) and custom roles in IndexedDB without quota eviction. |
| `alarms` | Schedules the periodic check for a newer predefined-roles snapshot. |
| `contextMenus` | Adds a "Look up in IAM Lens" item for selected text such as a permission or role ID. |
| `identity` (optional) | Requested only when the user chooses to sign in, to obtain an OAuth token for listing custom roles. |
| Host `https://*.googleapis.com/` (optional) | Requested only at sign-in, to call the IAM API (`iam.googleapis.com`) and Cloud Resource Manager API (`cloudresourcemanager.googleapis.com`) from the browser. |
| OAuth scopes (at sign-in) | `https://www.googleapis.com/auth/iam` (the only scope besides `cloud-platform` that Google accepts for listing custom roles; shown as "Manage your IAM policies", but IAM Lens only reads role definitions) and `https://www.googleapis.com/auth/cloud-platform.read-only` (project and organisation search). See `docs/oauth-verification.md`. |
| Omnibox keyword `iam` | Lets users type `iam <query>` in the address bar to search. (A manifest key, not a permission prompt.) |
| Remote code | None. No remotely hosted code is used. |

## Privacy practices tab (data-use form)

- Does the extension collect or use user data? Only if the user signs in. Without sign-in, no user data is collected.
- Data types: tick only "Authentication information" (the optional OAuth token, used locally in the browser and never sent to the developer).
- OAuth scopes: `iam` and `cloud-platform.read-only`; the extension only makes read (GET) requests for role definitions and project/organisation names. Google's consent screen words `iam` as "Manage your IAM policies" because it offers no read-only scope for listing roles.
- Not collected: personally identifiable information, health, financial and payment, personal communications, location, web history, user activity, website content. Custom-role definitions fetched with the token are the user's own cloud configuration, are stored locally only and are deleted on sign-out. If the form's wording makes you want to tick another category for them, re-read the form's definition and keep the privacy policy consistent.
- Certifications (check all three):
  - I do not sell or transfer user data to third parties, outside of the approved use cases.
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
  - I do not use or transfer user data to determine creditworthiness or for lending purposes.
- Privacy policy URL: <PRIVACY_POLICY_URL>
- Limited Use: the extension complies with the Google API Services User Data Policy, including Limited Use.

## Test instructions for reviewers

No account is needed for the core features:

1. Install the extension and click the toolbar icon, then "Open in side panel".
2. Search `storage.objects.get`. Expect `roles/storage.objectViewer` near the top.
3. Search `roles/viewer`. Open it and check that the permission list and spectrum bar appear.
4. Type `iam bigquery admin` in the address bar. Expect the search to open.
5. Select text `compute.instances.list` on any web page, right-click, choose the IAM Lens item.
6. Turn off the network and repeat step 2. Results still appear (bundled snapshot).

Optional sign-in (needs a Google Cloud project with at least one custom role): open Settings (options page), choose "Sign in", approve the consent screen, pick a project. Custom roles appear with a "Custom" badge. Choose "Sign out": the custom roles disappear and the local data is deleted. A test account with a sample custom role can be supplied on request: <CONTACT_EMAIL>.
