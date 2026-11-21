/**
 * Hardcoded demo data (real GCP role / permission names) for judging the visual design.
 * Replaced by src/core-backed data in later phases; screens only see the plain shapes in ../types.
 */
import type {
  PermissionDetailData,
  PermissionEntry,
  Risk,
  RoleDetailData,
  RoleSummary,
  Stage,
} from '../types';
import type { ExampleQuery } from '../components';

const ADMIN_VERBS = new Set([
  'delete',
  'setIamPolicy',
  'actAs',
  'signBlob',
  'getAccessToken',
  'undelete',
  'implicitDelegation',
  'signJwt',
]);
const READ_VERBS = /^(get|list|search|export|query|read|check|test|view)/;

/** Tiny local verb classifier, only for demo data. */
export function riskOf(permission: string): Risk {
  const verb = permission.split('.').pop() ?? '';
  if (ADMIN_VERBS.has(verb)) return 'admin';
  return READ_VERBS.test(verb) ? 'read' : 'write';
}

const entries = (ids: string[]): PermissionEntry[] => ids.map((id) => ({ id, risk: riskOf(id) }));
const tally = (ps: PermissionEntry[]) => ({
  read: ps.filter((p) => p.risk === 'read').length,
  write: ps.filter((p) => p.risk === 'write').length,
  admin: ps.filter((p) => p.risk === 'admin').length,
});

const STORAGE_ADMIN = entries([
  'resourcemanager.projects.get',
  'resourcemanager.projects.list',
  'storage.buckets.create',
  'storage.buckets.createTagBinding',
  'storage.buckets.delete',
  'storage.buckets.deleteTagBinding',
  'storage.buckets.enableObjectRetention',
  'storage.buckets.get',
  'storage.buckets.getIamPolicy',
  'storage.buckets.getObjectInsights',
  'storage.buckets.list',
  'storage.buckets.listEffectiveTags',
  'storage.buckets.listTagBindings',
  'storage.buckets.restore',
  'storage.buckets.setIamPolicy',
  'storage.buckets.update',
  'storage.hmacKeys.create',
  'storage.hmacKeys.delete',
  'storage.hmacKeys.get',
  'storage.hmacKeys.list',
  'storage.hmacKeys.update',
  'storage.managedFolders.create',
  'storage.managedFolders.delete',
  'storage.managedFolders.get',
  'storage.managedFolders.getIamPolicy',
  'storage.managedFolders.list',
  'storage.managedFolders.setIamPolicy',
  'storage.multipartUploads.abort',
  'storage.multipartUploads.create',
  'storage.multipartUploads.list',
  'storage.multipartUploads.listParts',
  'storage.objects.create',
  'storage.objects.delete',
  'storage.objects.get',
  'storage.objects.getIamPolicy',
  'storage.objects.list',
  'storage.objects.restore',
  'storage.objects.setIamPolicy',
  'storage.objects.update',
]);

const OBJECT_VIEWER = entries([
  'resourcemanager.projects.get',
  'resourcemanager.projects.list',
  'storage.managedFolders.get',
  'storage.managedFolders.list',
  'storage.objects.get',
  'storage.objects.list',
]);

const RUN_INVOKER = entries(['run.jobs.run', 'run.routes.invoke']);

const FALLBACK = entries(['resourcemanager.projects.get', 'resourcemanager.projects.list']);

interface RoleSeed {
  id: string;
  title: string;
  stage?: Stage;
  description: string;
  permissions?: PermissionEntry[];
  /** Counts for roles whose full permission list is not included in the demo. */
  counts?: { read: number; write: number; admin: number };
}

const SEEDS: RoleSeed[] = [
  {
    id: 'roles/storage.admin',
    title: 'Storage Admin',
    description:
      'Grants full control of buckets and objects. When applied to an individual bucket, control applies only to the specified bucket and objects within the bucket.',
    permissions: STORAGE_ADMIN,
  },
  {
    id: 'roles/storage.objectViewer',
    title: 'Storage Object Viewer',
    description:
      'Grants access to view objects and their metadata, excluding ACLs. Can also list the objects in a bucket.',
    permissions: OBJECT_VIEWER,
  },
  {
    id: 'roles/storage.objectAdmin',
    title: 'Storage Object Admin',
    description:
      'Grants full control over objects, including listing, creating, viewing, and deleting objects.',
    counts: { read: 9, write: 9, admin: 5 },
  },
  {
    id: 'roles/storage.objectUser',
    title: 'Storage Object User',
    description: 'Grants access to create, view, list, update and delete objects and their metadata.',
    counts: { read: 8, write: 7, admin: 1 },
  },
  {
    id: 'roles/storage.objectCreator',
    title: 'Storage Object Creator',
    description:
      'Allows users to create objects. Does not give permission to view, delete, or overwrite objects.',
    counts: { read: 0, write: 2, admin: 0 },
  },
  {
    id: 'roles/storage.legacyObjectReader',
    title: 'Storage Legacy Object Reader',
    stage: 'DEPRECATED',
    description: 'Read-only access to objects without listing. Use Storage Object Viewer where possible.',
    permissions: entries([
      'resourcemanager.projects.get',
      'storage.objects.get',
      'storage.objects.getIamPolicy',
    ]),
  },
  {
    id: 'roles/run.invoker',
    title: 'Cloud Run Invoker',
    description: 'Can invoke Cloud Run services and jobs.',
    permissions: RUN_INVOKER,
  },
  {
    id: 'roles/bigquery.admin',
    title: 'BigQuery Admin',
    description: 'Provides permissions to manage all resources within the project.',
    counts: { read: 112, write: 74, admin: 31 },
  },
  {
    id: 'roles/editor',
    title: 'Editor',
    stage: 'GA',
    description: 'Edit access to all resources. Basic role, avoid in production.',
    counts: { read: 4102, write: 2290, admin: 18 },
  },
  {
    id: 'roles/viewer',
    title: 'Viewer',
    description: 'Read-only access to all resources. Basic role.',
    counts: { read: 3187, write: 0, admin: 0 },
  },
];

function toDetail(s: RoleSeed): RoleDetailData {
  const permissions = s.permissions ?? FALLBACK;
  return {
    id: s.id,
    title: s.title,
    stage: s.stage ?? 'GA',
    description: s.description,
    counts: s.counts ?? tally(permissions),
    permissions,
  };
}

export const ROLES: RoleDetailData[] = SEEDS.map(toDetail);
export const roleById = (id: string): RoleDetailData | undefined => ROLES.find((r) => r.id === id);
const summary = ({ id, title, stage, counts, description }: RoleDetailData): RoleSummary => ({
  id,
  title,
  stage,
  counts,
  description,
});

export const ROLE_SUMMARIES: RoleSummary[] = ROLES.map(summary);

const EXTRA_PERMISSIONS = entries([
  'storage.objects.get',
  'storage.objects.list',
  'storage.objects.create',
  'storage.objects.delete',
  'storage.objects.setIamPolicy',
  'storage.buckets.get',
  'storage.buckets.update',
  'compute.instances.create',
  'compute.instances.setMetadata',
  'iam.serviceAccounts.actAs',
  'iam.serviceAccounts.getAccessToken',
  'resourcemanager.projects.setIamPolicy',
  'bigquery.datasets.get',
  'bigquery.jobs.create',
  'run.routes.invoke',
]);

export const ALL_PERMISSIONS: PermissionEntry[] = [
  ...new Map([...ROLES.flatMap((r) => r.permissions), ...EXTRA_PERMISSIONS].map((p) => [p.id, p])).values(),
].sort((a, b) => a.id.localeCompare(b.id));

const DESCRIPTIONS: Record<string, string> = {
  'storage.objects.get': 'Read object data and metadata, excluding ACLs. Required to download an object.',
  'storage.objects.list': 'List objects in a bucket.',
  'storage.objects.delete': 'Delete objects. Irreversible unless versioning or soft delete is on.',
  'iam.serviceAccounts.actAs': 'Impersonate a service account when creating resources that run as it.',
};

export function permissionDetail(id: string): PermissionDetailData {
  // Demo data: ids outside the fixtures still resolve so any route renders.
  const grantedBy = ROLES.filter((r) => r.permissions.some((p) => p.id === id)).map(summary);
  const withBroad = [
    ...grantedBy,
    ...ROLE_SUMMARIES.filter((r) => ['roles/editor', 'roles/viewer'].includes(r.id) && riskOf(id) === 'read'),
    ...ROLE_SUMMARIES.filter((r) => r.id === 'roles/editor' && riskOf(id) !== 'read'),
  ];
  const unique = [...new Map(withBroad.map((r) => [r.id, r])).values()];
  return { id, risk: riskOf(id), description: DESCRIPTIONS[id], grantedBy: unique };
}

export function search(query: string): { roles: RoleSummary[]; permissions: PermissionEntry[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { roles: [], permissions: [] };
  const words = q.replace(/^roles\//, '').split(/\s+/);
  const hit = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  return {
    roles: ROLE_SUMMARIES.filter((r) => hit(`${r.id} ${r.title}`)),
    permissions: ALL_PERMISSIONS.filter((p) => hit(p.id)),
  };
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  { text: 'storage.objects.get', kind: 'permission', risk: 'read' },
  { text: 'compute.instances.create', kind: 'permission', risk: 'write' },
  { text: 'resourcemanager.projects.setIamPolicy', kind: 'permission', risk: 'admin' },
  { text: 'roles/run.invoker', kind: 'role' },
  { text: 'bigquery admin', kind: 'phrase' },
];
