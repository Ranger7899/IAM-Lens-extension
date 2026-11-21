import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './ListItem.module.css';

/** Up/Down/Home/End move focus between the row buttons of one list. */
function roveFocus(e: KeyboardEvent<HTMLUListElement>) {
  const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
  const i = items.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  const next =
    e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : i + (e.key === 'ArrowDown' ? 1 : -1);
  items[Math.min(items.length - 1, Math.max(0, next))]?.focus();
}

export interface ListProps {
  label: string;
  children: ReactNode;
}

/** Console list: flat dense rows, no dividers. */
export function List({ label, children }: ListProps) {
  return (
    <ul className={styles.list} aria-label={label} onKeyDown={roveFocus}>
      {children}
    </ul>
  );
}

export interface ListItemProps {
  headline: ReactNode;
  supporting?: ReactNode;
  leadingIcon?: IconName;
  /** Custom leading content (e.g. a service icon); wins over leadingIcon */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** A separate control (e.g. copy) placed beside the row button; never nest buttons in `headline` */
  action?: ReactNode;
  /** Full-width content under the text (e.g. a PrivilegeBar) */
  extra?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  /** Legacy stagger index (rows no longer animate) */
  index?: number;
  /** Accessible name override for the row button */
  label?: string;
}

export function ListItem({
  headline,
  supporting,
  leadingIcon,
  leading,
  trailing,
  extra,
  action,
  onClick,
  selected,
  index = 0,
  label,
}: ListItemProps) {
  const body = (
    <>
      {leading ?? (leadingIcon && <Icon name={leadingIcon} className={styles.lead} />)}
      <span className={styles.text}>
        <span className={styles.headline}>{headline}</span>
        {supporting && <span className={styles.supporting}>{supporting}</span>}
        {extra && <span className={styles.extra}>{extra}</span>}
      </span>
      {trailing && <span className={styles.trail}>{trailing}</span>}
    </>
  );
  return (
    <li className={`${styles.li} reveal`} style={{ '--i': index } as CSSProperties}>
      <div
        className={`${styles.root} ${selected ? styles.selected : ''} ${onClick ? styles.interactive : ''}`}
      >
        {onClick ? (
          <button
            type="button"
            className={styles.main}
            onClick={onClick}
            aria-current={selected || undefined}
            aria-label={label}
          >
            {body}
          </button>
        ) : (
          <div className={styles.main}>{body}</div>
        )}
        {action && <span className={styles.action}>{action}</span>}
      </div>
    </li>
  );
}
