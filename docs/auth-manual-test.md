# Manual sign-in and scope test (IAM-19)

Agents cannot sign in, so run this once yourself. Scope under test: `https://www.googleapis.com/auth/cloud-platform.read-only`.

1. Build: `npm run build`. Open `chrome://extensions`, enable Developer mode, Load unpacked, choose `.output/chrome-mv3`.
2. Confirm the extension ID is `nkkmmkcohkjacpgiaiiadjmhcbmhgaen`.
3. Open the extension's service worker console (Inspect views: service worker) or any extension page console (e.g. the options page).
4. `signIn()` needs a user gesture, so trigger it from a click. Until the IAM-20 options UI exists, use a temporary button (for example in a dev build, a throwaway `<button>` in the options page whose click handler calls `signIn()` from `@/core/gcp`). Once IAM-20 lands, click "Sign in" there.
5. Accept the optional permissions prompt (identity and googleapis.com), then pick your Google account and grant read-only access. The consent screen is External/Testing, so your account must be a listed test user; expect an "unverified app" warning.
6. In the same console verify `await isSignedIn()` returns `true`.
7. Scope test, replacing `<id>` with a project you can read:
   - `await searchProjects('')` returns an array of `{id, displayName, name}` (needs Cloud Resource Manager API enabled and `resourcemanager.projects.get`).
   - `await fetchCustomRoles('projects/<id>')` returns custom roles (needs IAM API enabled and `iam.roles.list`).
   Both are imported from `@/core/gcp` and take `{ getToken }` (also exported from `@/core/gcp`), e.g. `searchProjects('', { getToken })`.
8. Record the result on IAM-6/IAM-19. A 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` means the scope is too narrow; 403 `SERVICE_DISABLED` means the API is not enabled in the GCP project.
9. Sign-out check: call `await signOut()`; `isSignedIn()` becomes `false` and stored custom roles are cleared. Re-open https://myaccount.google.com/permissions to confirm the app grant is gone.
10. Silent refresh check: set `chrome.storage.session` `gcpAuth.expiresAt` to a past time, then `await getToken()`; it should return a new token without a popup (or throw `AuthRequiredError` if Google needs interaction).
