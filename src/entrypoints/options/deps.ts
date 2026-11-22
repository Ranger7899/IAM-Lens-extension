/** Everything the options page needs from the outside world, injectable for tests and screenshots. */
import type { Route } from '@/entrypoints/sidepanel/routes';
import type { WhatsNewLoader } from '@/ui/whatsnew/useWhatsNew';
import type { CustomRoleInput, MetaRecord, UpdateResult } from '@/core';
import type { GcpResource } from '@/core/gcp';

export interface OptionsDeps {
  version: string;
  isSignedIn(): Promise<boolean>;
  /** True when the stored token was granted before the `iam` scope was requested. */
  needsScopeUpgrade?(): Promise<boolean>;
  /** Must be called straight from a click handler (user gesture). */
  signIn(): Promise<void>;
  /** Revokes the token and clears local custom roles. */
  signOut(): Promise<void>;
  listProjects(): Promise<GcpResource[]>;
  listOrganizations(): Promise<GcpResource[]>;
  /** IAM API fetch of the custom roles defined on `projects/<id>` or `organizations/<id>`. */
  fetchRoles(parent: string): Promise<CustomRoleInput[]>;
  /** Local store. */
  storedRoles(): Promise<CustomRoleInput[]>;
  saveRoles(roles: readonly CustomRoleInput[]): Promise<void>;
  deleteRolesByParent(parent: string): Promise<void>;
  getMeta(): Promise<MetaRecord>;
  patchMeta(patch: MetaRecord): Promise<MetaRecord>;
  refreshNow(): Promise<UpdateResult>;
  /** Opens the side panel on `route`. Must be called straight from a click handler (user gesture). */
  openInPanel(route: Route): void;
  /** Snapshot loader for What's new; defaults to the real stores. */
  whatsNew?: WhatsNewLoader;
}
