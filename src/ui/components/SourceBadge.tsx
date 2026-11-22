import { useSourceInfo } from '../data/sourceInfo';
import styles from './SourceBadge.module.css';

/** `projects/my-proj` -> `my-proj`, `organizations/123` -> `123`. */
export function sourceLabel(parent: string): string {
  const i = parent.indexOf('/');
  return i >= 0 ? parent.slice(i + 1) : parent;
}

/**
 * Quiet tonal chip marking a custom role and where it is defined: "Custom · <display name> (project)".
 * The name comes from the synced `meta.customSources`; unknown sources fall back to the id.
 */
export function SourceBadge({ parent }: { parent: string }) {
  const info = useSourceInfo(parent);
  const kind = info?.kind ?? (parent.startsWith('organizations/') ? 'organization' : 'project');
  const name = info?.displayName || sourceLabel(parent);
  const kindLabel = kind === 'organization' ? 'org' : 'project';
  return (
    <span className={styles.root} title={`Custom role from ${name} (${parent})`}>
      <span>Custom</span>
      <span className={styles.dot} aria-hidden="true">
        ·
      </span>
      <span className={styles.id}>{name}</span>
      <span className={styles.kind}>({kindLabel})</span>
    </span>
  );
}
