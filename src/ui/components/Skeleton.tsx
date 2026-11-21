import styles from './Skeleton.module.css';

export interface SkeletonListProps {
  rows?: number;
  label?: string;
}

/** M3 loading skeleton shaped like the dense list items it stands in for. */
export function SkeletonList({ rows = 7, label = 'Loading role data' }: SkeletonListProps) {
  return (
    <ul className={styles.list} role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={styles.row} aria-hidden="true">
          <span className={`${styles.bone} ${styles.avatar}`} />
          <span className={styles.text}>
            <span
              className={`${styles.bone} ${styles.line1}`}
              style={{ width: `${48 + ((i * 17) % 30)}%` }}
            />
            <span
              className={`${styles.bone} ${styles.line2}`}
              style={{ width: `${70 + ((i * 11) % 24)}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
