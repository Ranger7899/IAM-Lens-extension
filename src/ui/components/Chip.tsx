import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Chip.module.css';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  kind?: 'assist' | 'filter';
  /** Filter chips only */
  selected?: boolean;
  icon?: string;
  children: ReactNode;
}

export function Chip({ kind = 'assist', selected = false, icon, children, className, ...rest }: ChipProps) {
  const filter = kind === 'filter';
  return (
    <button
      type="button"
      className={`${styles.root} ${selected ? styles.selected : ''} ${className ?? ''}`}
      aria-pressed={filter ? selected : undefined}
      {...rest}
    >
      {filter && selected ? <Icon name="check" size={18} /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
