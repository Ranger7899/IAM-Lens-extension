import { browser } from 'wxt/browser';
import {
  deleteCustomRolesByParent,
  getMeta,
  listCustomRoles,
  patchMeta,
  saveCustomRoles,
  type UpdateResult,
} from '@/core';
import {
  fetchCustomRoles,
  getToken,
  isSignedIn,
  searchOrganizations,
  searchProjects,
  signIn,
  signOut,
} from '@/core/gcp';
import type { OptionsDeps } from './deps';

export const realDeps: OptionsDeps = {
  version: browser.runtime.getManifest().version,
  isSignedIn,
  signIn,
  signOut,
  listProjects: () => searchProjects('', { getToken }),
  listOrganizations: () => searchOrganizations({ getToken }),
  fetchRoles: (parent) => fetchCustomRoles(parent, { getToken }),
  storedRoles: listCustomRoles,
  saveRoles: saveCustomRoles,
  deleteRolesByParent: deleteCustomRolesByParent,
  getMeta,
  patchMeta,
  refreshNow: () => browser.runtime.sendMessage({ type: 'refresh-now' }) as Promise<UpdateResult>,
};
