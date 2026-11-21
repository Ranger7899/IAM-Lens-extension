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

/** Last meaningful chunk of a role name, used to suggest a search ("roles/storage.foo" -> "storage foo"). */
export function suggestQuery(name: string): string {
  const last = name.split('/').pop() ?? name;
  return last.replace(/[._-]+/g, ' ').trim();
}
