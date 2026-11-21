import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string;
  /** Required: icon-only buttons need an accessible name */
  label: string;
  variant?: 'standard' | 'tonal';
}

export function IconButton({ icon, label, variant = 'standard', className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${styles.root} ${styles[variant]} ${className ?? ''}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
