# Verification replies: IAM Lens

Prep sheet of ready-to-paste replies for Google OAuth verification (Trust & Safety) and Chrome Web Store review. Each entry has a one-line "when you'll see this" and a reply under about 150 words. Items marked **[CHECK]** are not verifiable from the repo: confirm them before sending. Replace `[0:52]`-style placeholders with real timestamps of the final video.

Fixed facts used below:

- Project `iam-chrome`. Developer Yousef Masad, ysfmasad@gmail.com. Source (MIT): https://github.com/Ranger7899/IAM-Lens-extension
- Chrome Extension client `609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb.apps.googleusercontent.com` (`chrome.identity.getAuthToken`, Item ID `odnpdglkmklhecdmggaebgakadfciooc`).
- Web application client `609543680898-n8hac6to84t8kf4qimatt2inbesumusr.apps.googleusercontent.com` (origin `https://iamlens.vaultline.cloud`, redirect `https://iamlens.vaultline.cloud/auth/callback.html`).
- Scopes: `https://www.googleapis.com/auth/iam` and `https://www.googleapis.com/auth/cloud-platform.read-only` (both listed as sensitive (confirmed on the Data Access page, 2026-11-22)).
- Authorized domain `vaultline.cloud`. Homepage `https://iamlens.vaultline.cloud/`, privacy `/privacy.html`, terms `/terms.html`.
- Privacy policy headings (site/privacy.html): What IAM Lens is; No analytics, no tracking, no remote code; Predefined roles snapshot; Optional sign-in and custom roles; Google user data IAM Lens accesses; When IAM Lens contacts Google; Scopes requested and why; How your data is used, stored and shared; Deleting your data; Google API Services User Data Policy; Permissions; Children; Changes to this policy; Contact.

---

## How to reply

1. Answer in the same email thread (reply, do not start a new one), so the case ID stays attached.
2. Keep it short and factual. Answer only what was asked. Link to evidence (docs, source, video timestamp) instead of explaining at length.
3. Never argue or push back on tone. If a reviewer is wrong, restate the fact once with a link, and offer to change the thing (re-record, reword, adjust).
4. Fix what you can before replying (video, page text), then say what you changed.
5. Do not send tokens, passwords or screenshots with real project names.
6. Paste Google's full email (including any case ID and bullet list of issues) to the main session. It will write a tailored reply from this sheet and the repo. Do not send the reply before that.

---

## 1. "Request a narrower scope" / why `auth/iam`

**When you'll see this:** Google flags `auth/iam` ("Manage your IAM policies") as broader than needed, or asks why a read-only scope is not enough.

> Thank you for the review. IAM Lens lists a user's custom IAM roles with `roles.list`. Google's API reference for projects.roles.list (https://cloud.google.com/iam/docs/reference/rest/v1/projects.roles/list) and organizations.roles.list (https://cloud.google.com/iam/docs/reference/rest/v1/organizations.roles/list) accepts only `https://www.googleapis.com/auth/iam` or `https://www.googleapis.com/auth/cloud-platform`. We tested `cloud-platform.read-only`: it returns 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT. `iam` is therefore the narrowest scope that works (`cloud-platform` is broader). The extension only issues HTTP GET requests, through a client that has no other method: https://github.com/Ranger7899/IAM-Lens-extension/blob/main/src/core/gcp/iam.ts (see also src/core/gcp/http.ts in the same repo). It never changes any role, policy or resource. If you know of a narrower scope accepted by these methods, we will switch to it.

[CHECK] the GitHub branch name (`main`) and that the 403 test result is reproducible; re-run it before sending if unsure.

## 2. Why `cloud-platform.read-only`

**When you'll see this:** "Explain why each scope is needed", or a note that this scope can reveal the account email.

> `https://www.googleapis.com/auth/cloud-platform.read-only` is used only for Cloud Resource Manager `projects.search` and `organizations.search` (GET), so the extension can discover which projects and organizations the signed-in account can access and then list their custom roles. We understand its description also mentions the account email [CHECK exact wording shown on the consent screen]. IAM Lens does not read the email: it requests no email, profile or OpenID scope and calls no user-info endpoint, as stated in the "Google user data IAM Lens accesses" section of https://iamlens.vaultline.cloud/privacy.html. Data stored locally is limited to project and organization IDs and display names and custom role definitions; it never leaves the browser and is deleted on sign-out. If a narrower scope covers project search, please tell us and we will adopt it.

## 3. Demo video does not show the OAuth client ID, or not all clients

**When you'll see this:** "Your video must show the OAuth client ID" or "must include all OAuth clients in the project."

> Thank you. The project has two OAuth clients and both appear in the video: the Chrome Extension client (ending `...4i6tksn4`) at 0:55–1:03 (shown in the extension's "Before you sign in" sheet, zoomed at 0:59) and in Google's address bar as `client_id=` at 1:09, and the Web application client (ending `...n8hac6to`) at 2:14–2:24 (sheet, zoomed at 2:20) for "Use a different Google account". If you need a different view, we will re-record and resubmit within a day. Video: https://youtu.be/czmlDa5QkYY.

Timestamps are from the final cut `IAM-Lens-demo-verification.mp4` (3:20).

## 4. Video does not show the full consent flow or the app name

**When you'll see this:** "The video does not show the end-to-end OAuth grant" or "the app name is not visible on the consent screen."

> Thank you. The video shows the full flow for both sign-in methods: clicking Sign in in Settings (0:50), the account chooser "to continue to IAM Lens" (1:05), the unverified-app screen (1:17), Google's consent screen with the app name and both scopes (1:27–1:42, zoomed at 1:36), the extension then using the data: synced custom roles, their source projects and organizations, and a custom role's permissions (1:42–2:04), and Sign out & clear with token revocation (2:04). The Web application client flow (account picker, unverified screen, consent as a second account) is at 2:14–3:04. We will re-record with longer holds on the consent screen if that is clearer. Video: https://youtu.be/czmlDa5QkYY.

Timestamps are from the final cut (3:20).

## 5. Homepage issues

**When you'll see this:** "Homepage does not describe your app", "no link to the privacy policy", or "not on a verified domain."

> Thank you. The homepage is https://iamlens.vaultline.cloud/, on our verified domain vaultline.cloud. It describes what IAM Lens does (looks up which Google Cloud IAM roles grant a permission and which permissions a role contains), how the optional Google sign-in is used, and links to the privacy policy (https://iamlens.vaultline.cloud/privacy.html) and terms (https://iamlens.vaultline.cloud/terms.html). The consent screen uses the same URLs. It also states that the app is independent and not affiliated with Google. Please tell us which requirement you do not see met and we will fix it right away.

[CHECK] open site/index.html and confirm it visibly links privacy and terms and describes the sign-in use before sending. [CHECK] Search Console shows the domain as verified (see item 7: vaultline.cloud verified 2026-11-22).

## 6. Privacy policy issues

**When you'll see this:** "Privacy policy does not disclose how you use Google user data" or "no Limited Use statement."

> Thank you. Our policy at https://iamlens.vaultline.cloud/privacy.html has these sections: "Google user data IAM Lens accesses" (project and organization IDs and display names, custom role definitions, the OAuth token), "When IAM Lens contacts Google", "Scopes requested and why", "How your data is used, stored and shared" (local-only storage, nothing sent to the developer, no advertising, no human reading), "Deleting your data", and "Google API Services User Data Policy", which states that our use and transfer of information received from Google APIs adheres to that policy, including the Limited Use requirements. If you want specific wording added or changed, tell us and we will update the page and confirm.

## 7. Domain ownership

**When you'll see this:** "Verify ownership of your authorized domains" / "The homepage is not on a domain you own."

> Thank you. The authorized domain is vaultline.cloud, and it is the only one listed. It hosts the homepage, privacy policy, terms and the OAuth callback page. It is verified in Google Search Console (2026-11-22) by an Owner of the project iam-chrome. We do not use or need chromiumapp.org: the Chrome Extension client has no redirect URI, and the Web application client redirects to https://iamlens.vaultline.cloud/auth/callback.html. Please let us know if you see a domain in the consent screen settings that is not verified.

## 8. Request for test credentials

**When you'll see this:** "Provide a test account or instructions so we can test the app."

> Thank you. The core features need no account: install, search `storage.objects.get`, open `roles/viewer`. The optional sign-in works with any Google account that can access a Google Cloud project containing at least one custom IAM role (Settings, Custom roles, Sign in; the custom role then shows a "Custom" badge in search). To avoid sending credentials by email, we can supply a test account privately by reply on request [CHECK: only offer this if a throwaway account with a sample custom role exists and has no sensitive data; never include a password in the thread unless Google asks through its official form]. Reviewer steps are also at https://github.com/Ranger7899/IAM-Lens-extension.

## 9. Branding, app name, logo, trademark

**When you'll see this:** "App name or logo may mislead users / uses Google branding" or "Google trademark".

> Thank you. "IAM Lens" is our own name, not a Google product name, and does not begin with a Google trademark. The logo is our own artwork; no Google or Google Cloud logo or wordmark appears in it. The homepage, privacy policy and extension About card state: "Not affiliated with Google. Google Cloud and related icons are trademarks of Google LLC." The developer is named as Yousef Masad (ysfmasad@gmail.com). If you want a different name or logo, we will change it and resubmit.

[CHECK] the logo file (`scripts/brand/consent-logo-120.png`) contains no Google marks. The homepage footer wording differs slightly ("Google Cloud is a trademark of Google LLC"); align the two before sending.

## 10. "Your app requests scopes it doesn't use"

**When you'll see this:** Google says one of the scopes is not used in the demo or in API calls.

> Thank you. Both scopes are used, all with GET only. `cloud-platform.read-only`: Cloud Resource Manager `projects:search` and `organizations:search`. `iam`: IAM `roles.list` for each project and organization found (`/v1/projects/<id>/roles` and `/v1/organizations/<id>/roles`), which Google restricts to `iam` or `cloud-platform`. The calls are in the video at [2:05-2:40] (the sync status row and the refresh button), and in source: https://github.com/Ranger7899/IAM-Lens-extension/blob/main/src/core/gcp/iam.ts and src/core/gcp/crm.ts. If a scope is not visibly exercised in the video, we will re-record to show its calls. We request nothing else.

[CHECK] timestamps. Optional: show the service-worker Network panel with GETs in the re-record.

## 11. The redirect / callback page

**When you'll see this:** "Explain what https://iamlens.vaultline.cloud/auth/callback.html does" or a security question about the redirect URI.

> The page is a static file (source: https://github.com/Ranger7899/IAM-Lens-extension/blob/main/site/auth/callback.js) used only by the optional "Use a different Google account" sign-in. Google returns the token in the URL fragment, which browsers never send to any server, so it does not reach our hosting. The page's script reads the fragment, immediately clears it from the address bar, and forwards it to the extension with `chrome.runtime.sendMessage`. `externally_connectable` in the manifest is limited to `https://iamlens.vaultline.cloud/auth/*`. The extension accepts a message only from that exact origin and path and only with a single-use `state` it generated (valid 10 minutes). The page makes no network requests, stores nothing, loads nothing from other sites and has no analytics.

## 12. Chrome Web Store questions

### 12a. Permission justifications (unlimitedStorage, alarms, contextMenus, identity)

**When you'll see this:** "Justify the permissions requested" or "unnecessary permissions".

> `unlimitedStorage`: stores the bundled roles snapshot (about 2 MB, about 2,400 roles and 14,000 permissions) and synced custom roles in IndexedDB without quota eviction. `alarms`: schedules the periodic check for a newer predefined-roles snapshot. `contextMenus`: adds "Look up in IAM Lens" for selected text such as a permission or role ID. `identity` is optional and requested only when the user clicks Sign in, to get an OAuth token through `chrome.identity.getAuthToken` for read-only custom-role lookup. The optional host permission `https://*.googleapis.com/` is requested at the same moment, for `iam.googleapis.com` and `cloudresourcemanager.googleapis.com`. Also used: `sidePanel` (the lookup UI) and `storage` (settings). No remote code.

### 12b. Single purpose

**When you'll see this:** "Your item does not meet the single purpose policy."

> IAM Lens has one purpose: to let users look up which Google Cloud IAM roles grant a permission, and which permissions a role contains. It uses a bundled snapshot of predefined roles and, optionally, the user's own custom roles, so those appear in the same search. The side-panel Search, Minimal roles and Compare views, the toolbar popup, omnibox keyword and context menu are all entry points to that one lookup. Sign-in is optional and used only to add custom roles to it.

### 12c. Google trademarks, look-alike UI, official Google Cloud icons

**When you'll see this:** "Your item uses Google trademarks or imitates Google UI" or an impersonation notice.

> IAM Lens is an independent project and is not affiliated with Google. The name, icon and store images are our own; none uses a Google or Google Cloud logo or wordmark, and the name does not start with a Google trademark. Official Google Cloud service icons (from cloud.google.com/icons, vendored unmodified) appear inside the UI only to identify which service a role or permission belongs to. If you prefer, we will replace them with generic icons and resubmit promptly. The listing and privacy policy include: "Not affiliated with Google. Google Cloud and related icons are trademarks of Google LLC."

[CHECK] that the store screenshots contain no Google logo or Google-product UI.

### 12d. Data disclosure mismatch

**When you'll see this:** "Your data-use disclosures do not match your privacy policy / what the code does."

> Thank you. Our disclosures say: no data is collected unless the user signs in; the only category ticked is "Authentication information" (the optional OAuth token, kept in the browser and never sent to the developer). With sign-in, the extension reads project and organization IDs and display names and custom role definitions with read-only (GET) requests, stores them locally in IndexedDB and deletes them on sign-out. Nothing is transmitted to us or third parties. This matches https://iamlens.vaultline.cloud/privacy.html. We certify we do not sell or transfer user data and do not use it for unrelated purposes or creditworthiness. If the form needs another category ticked for the role and project data, tell us which and we will update the form and policy together.

[CHECK] the dashboard's current Privacy practices tab matches this (see docs/store-listing.md section "Privacy practices tab").
