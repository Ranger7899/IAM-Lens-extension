/** IAM v1: fetch the custom roles defined on a project or organization. */
import { z } from 'zod';
import type { CustomRoleInput } from '../model';
import { withFriendlyMessage } from './errors';
import { gcpPaginate, type GcpFetchOptions } from './http';

const IAM = 'https://iam.googleapis.com/v1';

export const iamRoleSchema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  includedPermissions: z.array(z.string()).optional(),
  stage: z.string().optional(),
  deleted: z.boolean().optional(),
});

export const listRolesResponseSchema = z.object({
  roles: z.array(iamRoleSchema).default([]),
  nextPageToken: z.string().optional(),
});

/** `parent` is `projects/<id>` or `organizations/<id>`. */
export async function listCustomRoles(parent: string, opts: GcpFetchOptions): Promise<CustomRoleInput[]> {
  const base = `${IAM}/${parent}/roles`;
  try {
    return await gcpPaginate(
      (t) => {
        const q = new URLSearchParams({ view: 'FULL', pageSize: '1000', showDeleted: 'false' });
        if (t) q.set('pageToken', t);
        return `${base}?${q.toString()}`;
      },
      opts,
      (json) => {
        const r = listRolesResponseSchema.parse(json);
        return {
          items: r.roles.map((role): CustomRoleInput => ({
            name: role.name,
            title: role.title,
            description: role.description,
            stage: role.stage,
            deleted: role.deleted,
            perms: role.includedPermissions ?? [],
            source: { kind: 'custom', parent },
          })),
          nextPageToken: r.nextPageToken,
        };
      },
    );
  } catch (e) {
    throw withFriendlyMessage(e, parent);
  }
}
