# Manual sign-in and scope test (IAM-19 / IAM-20)

Agents cannot sign in, so run this once yourself, using the real options page. Scopes under test: `https://www.googleapis.com/auth/iam` and `https://www.googleapis.com/auth/cloud-platform.read-only`.

0. Upgrade check (if you signed in before IAM-41): open the options page, click **Sign out & clear**, then sign in again below and accept the new permission. Google's consent screen now lists "Manage your IAM policies" as well as the read-only Cloud Platform access. Without signing out first, the card shows "Sign in again to grant the new permission"; use that button instead.
1. Build: `npm run build`. Open `chrome://extensions`, enable Developer mode, Load unpacked, choose `.output/chrome-mv3`.
2. Confirm the extension ID is `nkkmmkcohkjacpgiaiiadjmhcbmhgaen`.
3. Open the options page (extension details, Extension options). The Custom roles card should say "Sign in with Google".
4. Click **Sign in with Google**. A "Before you sign in" sheet appears first: check that it explains read-only access, the "Manage your IAM policies" wording (with a source link to `src/core/gcp/iam.ts`), local storage, how to revoke, the source link and the unverified-app note. Click **Continue**.
5. Accept the optional permissions prompt (identity and googleapis.com), then pick your Google account and grant both permissions (IAM policies and read-only Cloud Platform). The consent screen is External/Testing, so your account must be a listed test user; expect an "unverified app" warning. Afterwards the card shows a "Signed in" badge.
6. Click **Add projects or organizations**. The picker lists the projects and organizations you can see (this exercises `searchProjects` and `searchOrganizations`; it needs the Cloud Resource Manager API enabled and `resourcemanager.projects.get`). Use the filter box to narrow the list.
7. Click **Add** on a project that has custom roles. The source appears with its role count and "fetched just now" (this exercises `fetchCustomRoles('projects/<id>')`; it needs the IAM API enabled and `iam.roles.list`). A project without access shows the reason inline, for example "Your account can't list custom roles on projects/<id>".
8. Record the result on IAM-6/IAM-19. A 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` (shown as "IAM Lens needs an updated permission. Sign in again.") means the token lacks the `iam` scope; 403 `SERVICE_DISABLED` means the API is not enabled in the GCP project.
9. Refresh and remove: click the refresh icon on a source (the "fetched" time updates), then the remove icon (the source disappears).
10. Offline check: with a source added, turn on Chrome DevTools "Offline" throttling for the options page and click refresh. The source shows "You're offline..." and keeps its cached roles.
11. Sign-out check: click **Sign out & clear** and confirm in the dialog. The card returns to "Sign in with Google" and the source list is empty. Re-open https://myaccount.google.com/permissions to confirm the app grant is gone.
12. Silent refresh check: sign in again, then in an extension page console run `chrome.storage.session.get('gcpAuth')` and set `expiresAt` to a past time (`chrome.storage.session.set({gcpAuth: {token: 'x', expiresAt: 1}})`). Click refresh on a source: it should refresh silently without a popup, or show "Sign in again" if Google needs interaction.
13. Theme check: in Appearance choose Dark, then open the popup and side panel; both follow the override. Choose System to go back.
