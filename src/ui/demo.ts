/** Hardcoded display-only data for the Phase 1 shells. Replaced by src/core in later phases. */
import type { ExampleQuery } from './components';

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  { text: 'storage.objects.get', kind: 'permission', risk: 'read' },
  { text: 'compute.instances.create', kind: 'permission', risk: 'write' },
  { text: 'resourcemanager.projects.setIamPolicy', kind: 'permission', risk: 'admin' },
  { text: 'roles/run.invoker', kind: 'role' },
  { text: 'bigquery admin', kind: 'phrase' },
];
