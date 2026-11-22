import { createContext, useContext } from 'react';

/** Where a custom role lives, resolved from `meta.customSources`. */
export interface SourceInfo {
  parent: string;
  kind: 'project' | 'organization';
  displayName: string;
}

export const SourcesCtx = createContext<ReadonlyMap<string, SourceInfo>>(new Map());

/** The source (display name and kind) for a custom role's `projects/x` / `organizations/x` parent, if known. */
export function useSourceInfo(parent: string): SourceInfo | undefined {
  return useContext(SourcesCtx).get(parent);
}
