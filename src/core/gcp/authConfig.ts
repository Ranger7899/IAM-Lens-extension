/** OAuth configuration for custom-role sign-in (IAM-6). Web application client; no client secret is ever used. */
export const OAUTH_CLIENT_ID = '609543680898-5d2mldh754sb0h1o2ifmnf9p7t9d2g6d.apps.googleusercontent.com';
/** `iam` is required by roles.list (it rejects read-only); `cloud-platform.read-only` covers project/org search. */
export const IAM_SCOPE = 'https://www.googleapis.com/auth/iam';
export const READONLY_SCOPE = 'https://www.googleapis.com/auth/cloud-platform.read-only';
export const OAUTH_SCOPE = `${IAM_SCOPE} ${READONLY_SCOPE}`;
export const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const OAUTH_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
/** `storage.session` key for `{token, expiresAt}`. */
export const AUTH_STORAGE_KEY = 'gcpAuth';
/** Tokens with less than this many ms left are refreshed. */
export const TOKEN_MIN_TTL_MS = 60_000;
export const OPTIONAL_PERMISSIONS = {
  permissions: ['identity'],
  origins: ['https://*.googleapis.com/'],
} as const;
