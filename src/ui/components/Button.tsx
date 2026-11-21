import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'tonal' | 'text';
  icon?: string;
}

export function Button({ variant = 'filled', icon, children, className, ...rest }: ButtonProps) {
  return (
    <button type="button" className={`${styles.root} ${styles[variant]} ${className ?? ''}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}
