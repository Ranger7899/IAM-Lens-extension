import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/ui/components';
import styles from './Section.module.css';

export interface SectionProps {
  icon: IconName;
  /** Optional custom mark shown instead of the icon (e.g. the IAM Lens logo in About). */
  mark?: ReactNode;
  title: string;
  subtitle?: string;
  /** Right-aligned header content (e.g. a status chip). */
  aside?: ReactNode;
  /** Anchor id, e.g. `whatsnew` for `options.html#whatsnew`. */
  id?: string;
  children: ReactNode;
}

/** One options section: icon, 18/24 title, optional subtitle, then free-form content; sections are divided by a hairline. */
export function Section({ icon, mark, title, subtitle, aside, id, children }: SectionProps) {
  return (
    <section id={id} className={styles.card} aria-label={title} role="region">
      <header className={styles.head}>
        <span className={styles.tile}>{mark ?? <Icon name={icon} size={20} />}</span>
        <div className={styles.titles}>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {aside}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
