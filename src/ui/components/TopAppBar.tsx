import type { ReactNode } from 'react';
import styles from './TopAppBar.module.css';

export interface TopAppBarProps {
  title: string;
  leading?: ReactNode;
  actions?: ReactNode;
  /** Optional content below the title row (e.g. a segmented button) */
  children?: ReactNode;
}

export function TopAppBar({ title, leading, actions, children }: TopAppBarProps) {
  return (
    <header className={styles.root}>
      <div className={styles.row}>
        {leading}
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.actions}>{actions}</div>
      </div>
      {children && <div className={styles.extra}>{children}</div>}
    </header>
  );
}
