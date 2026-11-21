import type { ReactNode } from 'react';
import { PermissionToken, type Risk } from './PermissionToken';
import { Chip } from './Chip';
import styles from './EmptyState.module.css';

export interface ExampleQuery {
  text: string;
  kind: 'permission' | 'role' | 'phrase';
  risk?: Risk;
}

export interface EmptyStateProps {
  title: string;
  hint?: ReactNode;
  examples: ExampleQuery[];
  onPick?: (q: string) => void;
}

/** Empty state built from real example queries (no illustration). */
export function EmptyState({ title, hint, examples, onPick }: EmptyStateProps) {
  return (
    <section className={styles.root} aria-label="Examples">
      <h2 className={styles.title}>{title}</h2>
      {hint && <p className={styles.hint}>{hint}</p>}
      {examples.length > 0 && <p className={styles.eyebrow}>Try one of these</p>}
      <ul className={styles.list}>
        {examples.map((e) => (
          <li key={e.text}>
            {e.kind === 'permission' ? (
              <PermissionToken permission={e.text} risk={e.risk} onCopied={onPick} />
            ) : (
              <Chip onClick={() => onPick?.(e.text)} icon={e.kind === 'role' ? 'badge' : 'search'}>
                {e.text}
              </Chip>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
