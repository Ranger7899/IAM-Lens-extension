import type { RoleRecord } from '@/core';

export const DOCS_INDEX = 'https://cloud.google.com/iam/docs/roles-permissions';

/** Official docs page for a predefined role; the roles index for custom roles. */
export function docsUrl(role: Pick<RoleRecord, 'name' | 'source'>): string {
  if (role.source.kind !== 'predefined' || !role.name.startsWith('roles/')) return DOCS_INDEX;
  const short = role.name.slice('roles/'.length);
  const service = short.split('.')[0];
  if (!service) return DOCS_INDEX;
  return `${DOCS_INDEX}/${service}#${short}`;
}

export function gcloudDescribe(role: Pick<RoleRecord, 'name'>): string {
  return `gcloud iam roles describe ${role.name}`;
}

/** Hash routes (see router.tsx). Kept local so this folder doesn't import the router (it imports us). */
export const hrefPermission = (name: string) => `#/permission/${encodeURIComponent(name)}`;
export const hrefCompare = (roleName: string) => `#/compare?a=${encodeURIComponent(roleName)}`;
export const hrefSearch = (q: string) => (q ? `#/search?q=${encodeURIComponent(q)}` : '#/search');

export function navigate(href: string) {
  location.hash = href;
}

/** Last meaningful chunk of a role name, used to suggest a search ("roles/storage.foo" -> "storage foo"). */
export function suggestQuery(name: string): string {
  const last = name.split('/').pop() ?? name;
  return last.replace(/[._-]+/g, ' ').trim();
}
