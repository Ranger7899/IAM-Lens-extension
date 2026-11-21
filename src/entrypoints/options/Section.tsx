import type { ReactNode } from 'react';
import { Card, Icon, type IconName } from '@/ui/components';
import styles from './Section.module.css';

export interface SectionProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  /** Right-aligned header content (e.g. a status chip). */
  aside?: ReactNode;
  children: ReactNode;
}

/** One options card: icon tile, title, optional subtitle, then free-form content. */
export function Section({ icon, title, subtitle, aside, children }: SectionProps) {
  return (
    <Card variant="filled" className={styles.card} aria-label={title} role="region">
      <header className={styles.head}>
        <span className={styles.tile}>
          <Icon name={icon} size={22} />
        </span>
        <div className={styles.titles}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {aside}
      </header>
      <div className={styles.body}>{children}</div>
    </Card>
  );
}
