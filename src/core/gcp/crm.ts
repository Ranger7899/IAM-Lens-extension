/** Cloud Resource Manager v3: find the projects and organizations a user can attach custom roles to. */
import { z } from 'zod';
import { gcpPaginate, type GcpFetchOptions } from './http';

const CRM = 'https://cloudresourcemanager.googleapis.com/v3';

export interface GcpResource {
  /** Bare id: project id or numeric organization id. */
  id: string;
  displayName: string;
  /** Resource name: `projects/<number>` or `organizations/<number>`. */
  name: string;
}

export const projectsSearchResponseSchema = z.object({
  projects: z
    .array(
      z.object({
        name: z.string(),
        projectId: z.string(),
        displayName: z.string().optional(),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
});

export const organizationsSearchResponseSchema = z.object({
  organizations: z
    .array(
      z.object({
        name: z.string(),
        displayName: z.string().optional(),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
});

function withPage(base: string, params: Record<string, string>, pageToken: string | undefined): string {
  const q = new URLSearchParams(params);
  q.set('pageSize', '500');
  if (pageToken) q.set('pageToken', pageToken);
  return `${base}?${q.toString()}`;
}

/** Projects matching `query` (Google's search syntax, e.g. `id:my-proj*`). Empty query lists all visible. */
export function searchProjects(query: string, opts: GcpFetchOptions): Promise<GcpResource[]> {
  return gcpPaginate(
    (t) => withPage(`${CRM}/projects:search`, query ? { query } : {}, t),
    opts,
    (json) => {
      const r = projectsSearchResponseSchema.parse(json);
      return {
        items: r.projects.map((p) => ({
          id: p.projectId,
          displayName: p.displayName ?? p.projectId,
          name: p.name,
        })),
        nextPageToken: r.nextPageToken,
      };
    },
  );
}

export function searchOrganizations(opts: GcpFetchOptions): Promise<GcpResource[]> {
  return gcpPaginate(
    (t) => withPage(`${CRM}/organizations:search`, {}, t),
    opts,
    (json) => {
      const r = organizationsSearchResponseSchema.parse(json);
      return {
        items: r.organizations.map((o) => {
          const id = o.name.replace(/^organizations\//, '');
          return { id, displayName: o.displayName ?? id, name: o.name };
        }),
        nextPageToken: r.nextPageToken,
      };
    },
  );
}
