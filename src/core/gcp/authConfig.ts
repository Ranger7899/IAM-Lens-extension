/**
 * OAuth configuration for custom-role sign-in (IAM-58). "Chrome Extension" client (Item ID odnpdglkmklhecdmggaebgakadfciooc):
 * no redirect URI and no client secret. `wxt.config.ts` puts the same ID in the manifest `oauth2` block, which is
 * what `chrome.identity.getAuthToken` reads.
 */
export const OAUTH_CLIENT_ID = '609543680898-4i6tksn4mkca32r3mhd5h5ih7tm7c6vb.apps.googleusercontent.com';
/** `iam` is required by roles.list (it rejects read-only); `cloud-platform.read-only` covers project/org search. */
export const IAM_SCOPE = 'https://www.googleapis.com/auth/iam';
export const READONLY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform.read-only';
export const OAUTH_SCOPES = [IAM_SCOPE, READONLY_SCOPE];
export const OAUTH_SCOPE = OAUTH_SCOPES.join(' ');
export const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
/** `storage.session` key for `{token, expiresAt}`. */
export const AUTH_STORAGE_KEY = 'gcpAuth';
/** `getAuthToken` does not report an expiry; Google access tokens last about an hour, so assume this much. */
export const TOKEN_ASSUMED_TTL_MS = 50 * 60_000;
/** Tokens with less than this many ms left are refreshed. */
export const TOKEN_MIN_TTL_MS = 60_000;
export const OPTIONAL_PERMISSIONS = {
  permissions: ['identity'],
  origins: ['https://*.googleapis.com/'],
} as const;

/**
 * "Web application" OAuth client for the second sign-in method ("Use a different Google account", IAM-79).
 * The Chrome Extension client above rejects the web flow, so this is a separate client (authorized origin
 * https://iamlens.vaultline.cloud, redirect URI below) pointing at a static page on our own verified domain.
 * The second button is hidden when this is empty. e2e builds may override it at build time with
 * `WXT_TEST_WEB_CLIENT_ID`; that variable is unset in normal and store builds.
 */
export const WEB_OAUTH_CLIENT_ID: string =
  (typeof import.meta.env === 'object'
    ? (import.meta.env?.WXT_TEST_WEB_CLIENT_ID as string | undefined)
    : undefined) ?? '609543680898-n8hac6to84t8kf4qimatt2inbesumusr.apps.googleusercontent.com';
export const WEB_OAUTH_REDIRECT_URI = 'https://iamlens.vaultline.cloud/auth/callback.html';
export const WEB_AUTH_ORIGIN = 'https://iamlens.vaultline.cloud';
export const WEB_AUTH_CALLBACK_PATH = '/auth/callback.html';
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
/** Message type the callback page sends to the extension. */
export const OAUTH_MESSAGE_TYPE = 'iam-lens-oauth';
/** `storage.session` keys: the single pending sign-in `{state, expiresAt}` and the outcome the waiting `signIn` reads. */
export const AUTH_PENDING_KEY = 'gcpAuthPending';
export const AUTH_RESULT_KEY = 'gcpAuthResult';
/** A pending state is valid for this long. */
export const STATE_TTL_MS = 10 * 60_000;
