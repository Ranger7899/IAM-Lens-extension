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
  needsScopeUpgrade,
  searchOrganizations,
  searchProjects,
  signIn,
  signOut,
} from '@/core/gcp';
import { writePendingRoute } from '@/ui/data/pendingRouteStore';
import type { OptionsDeps } from './deps';

// Resolved ahead of time: sidePanel.open must run synchronously inside the click (user gesture).
let windowId: number | undefined;
void browser.windows
  .getCurrent()
  .then((w) => (windowId = w.id))
  .catch(() => {});

export const realDeps: OptionsDeps = {
  version: browser.runtime.getManifest().version,
  isSignedIn,
  needsScopeUpgrade,
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
  openInPanel(route) {
    const stored = writePendingRoute(route).catch(() => {});
    if (windowId !== undefined) void Promise.resolve(chrome.sidePanel.open({ windowId })).catch(() => {});
    void stored;
  },
};
