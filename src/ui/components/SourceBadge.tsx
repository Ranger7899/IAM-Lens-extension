import styles from './SourceBadge.module.css';

/** `projects/my-proj` -> `my-proj`, `organizations/123` -> `123`. */
export function sourceLabel(parent: string): string {
  const i = parent.indexOf('/');
  return i >= 0 ? parent.slice(i + 1) : parent;
}

/** Quiet tonal chip marking a custom role and where it is defined: "Custom · <project or org id>". */
export function SourceBadge({ parent }: { parent: string }) {
  const id = sourceLabel(parent);
  return (
    <span className={styles.root} title={`Custom role from ${parent}`}>
      <span>Custom</span>
      <span className={styles.dot} aria-hidden="true">
        ·
      </span>
      <span className={styles.id}>{id}</span>
    </span>
  );
}
