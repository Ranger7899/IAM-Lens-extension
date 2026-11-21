import type { HTMLAttributes } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
}

export function Card({ variant = 'filled', className, ...rest }: CardProps) {
  return <div className={`${styles.root} ${styles[variant]} ${className ?? ''}`} {...rest} />;
}
