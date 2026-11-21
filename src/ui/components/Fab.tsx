import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './Fab.module.css';

export interface FabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string;
  label: string;
  /** When true, only the icon is shown (e.g. after scrolling). The label stays as the accessible name. */
  collapsed?: boolean;
}

/** Extended FAB that collapses to a regular FAB. */
export function Fab({ icon, label, collapsed = false, className, ...rest }: FabProps) {
  return (
    <button
      type="button"
      aria-label={collapsed ? label : undefined}
      className={`${styles.root} ${collapsed ? styles.collapsed : ''} ${className ?? ''}`}
      {...rest}
    >
      <Icon name={icon} />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
