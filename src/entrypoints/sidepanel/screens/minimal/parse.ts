import { classifyQuery } from '@/core';

export interface ParsedToken {
  text: string;
  /** False when the token is not shaped like a full permission (`a.b.c`): wildcards, role IDs, plain words. */
  valid: boolean;
}

/** Splits pasted text on whitespace, commas and semicolons into unique tokens, each classified with `classifyQuery`. */
export function parsePermissionText(input: string): ParsedToken[] {
  const seen = new Set<string>();
  const out: ParsedToken[] = [];
  for (const raw of input.split(/[\s,;]+/)) {
    const t = raw.replace(/^[\s"'`([{<]+|[\s"'`)\]}>.:;,]+$/g, '');
    if (!t || seen.has(t)) continue;
    seen.add(t);
    const q = classifyQuery(t);
    out.push({ text: t, valid: q.kind === 'permission' && !q.partial });
  }
  return out;
}

/** `gcloud projects add-iam-policy-binding` snippet for one role, with placeholders. */
export function gcloudBinding(roleName: string): string {
  return `gcloud projects add-iam-policy-binding PROJECT_ID \\\n  --member="MEMBER" \\\n  --role="${roleName}"`;
}

export const EXAMPLE_PERMISSIONS = [
  'storage.objects.get',
  'storage.objects.list',
  'bigquery.tables.getData',
  'pubsub.topics.publish',
  'logging.logEntries.create',
];
