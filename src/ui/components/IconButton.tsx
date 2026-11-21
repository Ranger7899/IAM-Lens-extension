import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: icon-only buttons need an accessible name */
  label: string;
  variant?: 'standard' | 'tonal';
  size?: 'md' | 'sm';
}

export function IconButton({
  icon,
  label,
  variant = 'standard',
  size = 'md',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${styles.root} ${styles[variant]} ${size === 'sm' ? styles.sm : ''} ${className ?? ''}`}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 20 : 24} />
    </button>
  );
}
