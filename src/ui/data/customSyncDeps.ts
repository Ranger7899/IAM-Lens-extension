import {
  deleteCustomRolesByParent,
  getMeta,
  listCustomRoles,
  patchMeta,
  saveCustomRoles,
} from '@/core';
import { fetchCustomRoles, getToken, hasSession, searchOrganizations, searchProjects } from '@/core/gcp';
import type { SyncDeps } from './customSync';

/** The real Google-backed sync dependencies. */
export const realSyncDeps: SyncDeps = {
  isSignedIn: hasSession,
  listProjects: () => searchProjects('', { getToken }),
  listOrganizations: () => searchOrganizations({ getToken }),
  fetchRoles: (parent) => fetchCustomRoles(parent, { getToken }),
  storedRoles: listCustomRoles,
  saveRoles: saveCustomRoles,
  deleteRolesByParent: deleteCustomRolesByParent,
  getMeta,
  patchMeta,
};
