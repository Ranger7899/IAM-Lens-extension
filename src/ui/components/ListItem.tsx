import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './ListItem.module.css';

export interface ListItemProps {
  headline: ReactNode;
  supporting?: ReactNode;
  leadingIcon?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  /** Stagger index for the entry animation (capped at 8) */
  index?: number;
}

export function ListItem({
  headline,
  supporting,
  leadingIcon,
  trailing,
  onClick,
  selected,
  index = 0,
}: ListItemProps) {
  const body = (
    <>
      {leadingIcon && <Icon name={leadingIcon} className={styles.lead} />}
      <span className={styles.text}>
        <span className={styles.headline}>{headline}</span>
        {supporting && <span className={styles.supporting}>{supporting}</span>}
      </span>
      {trailing && <span className={styles.trail}>{trailing}</span>}
    </>
  );
  const cls = `${styles.root} ${selected ? styles.selected : ''}`;
  const style = { animationDelay: `${Math.min(index, 8) * 40}ms` };
  return (
    <li className={styles.li} style={style}>
      {onClick ? (
        <button type="button" className={cls} onClick={onClick} aria-current={selected || undefined}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
