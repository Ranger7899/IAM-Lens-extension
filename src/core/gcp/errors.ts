/** Friendly, reason-specific messages for Google API failures. Shared by `iam.ts`, `crm.ts` and the options UI. */
import { GcpApiError } from './http';

export type GcpErrorKind = 'scope' | 'permission' | 'service-disabled' | 'other';

const MAX_MESSAGE = 200;

export function classifyGcpError(e: GcpApiError): GcpErrorKind {
  if (e.reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' || /insufficient authentication scopes/i.test(e.message))
    return 'scope';
  if (e.reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(e.message))
    return 'service-disabled';
  if (e.status === 403 && (e.reason === 'IAM_PERMISSION_DENIED' || e.reason === 'PERMISSION_DENIED'))
    return 'permission';
  return 'other';
}

/** Google's own message, collapsed and trimmed. */
export function trimGoogleMessage(message: string): string {
  const m = message.replace(/\s+/g, ' ').trim();
  return m.length > MAX_MESSAGE ? `${m.slice(0, MAX_MESSAGE - 1)}…` : m;
}

/** `parent` is the `projects/<id>` / `organizations/<id>` whose roles were being listed, if any. */
export function friendlyGcpMessage(e: GcpApiError, parent?: string): string {
  switch (classifyGcpError(e)) {
    case 'scope':
      return 'IAM Lens needs an updated permission. Sign in again.';
    case 'service-disabled':
      return 'The IAM API is disabled for this request. Enable the IAM and Resource Manager APIs, then refresh.';
    case 'permission':
      return parent
        ? `Your account can't list custom roles on ${parent}. It needs iam.roles.list (for example the Role Viewer role).`
        : 'Access denied. Your account needs resourcemanager.projects.get to list projects, or iam.roles.list to read their roles.';
    default:
      return trimGoogleMessage(e.message) || `Google returned an error (${e.status}).`;
  }
}

/** Same status and reason, friendlier message. Non-Google errors pass through. */
export function withFriendlyMessage(e: unknown, parent?: string): unknown {
  return e instanceof GcpApiError ? new GcpApiError(e.status, e.reason, friendlyGcpMessage(e, parent)) : e;
}
