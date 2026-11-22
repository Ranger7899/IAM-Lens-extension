/**
 * OAuth configuration for custom-role sign-in (IAM-58). "Chrome Extension" client (Item ID nkkmmkcohkjacpgiaiiadjmhcbmhgaen):
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
