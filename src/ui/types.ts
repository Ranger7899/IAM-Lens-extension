/** Plain data shapes the presentational screens accept. Deliberately independent of src/core. */
export type Risk = 'read' | 'write' | 'admin';
export type Stage = 'GA' | 'BETA' | 'ALPHA' | 'DEPRECATED';

export interface RiskCounts {
  read: number;
  write: number;
  admin: number;
}

export interface RoleSummary {
  /** e.g. "roles/storage.objectViewer" */
  id: string;
  title: string;
  stage: Stage;
  counts: RiskCounts;
  description?: string;
}

export interface PermissionEntry {
  /** e.g. "storage.objects.get" */
  id: string;
  risk: Risk;
}

export interface RoleDetailData extends RoleSummary {
  permissions: PermissionEntry[];
}

export interface PermissionDetailData extends PermissionEntry {
  description?: string;
  /** Roles granting this permission. The screen sorts them so the smallest comes first. */
  grantedBy: RoleSummary[];
}
