import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Badge.module.css';

/** Tonal "Least privilege" badge with the spark icon: marks the smallest role granting a permission. */
export function LeastPrivilegeBadge({ label = 'Least privilege' }: { label?: string }) {
  return (
    <span className={`${styles.root} ${styles.spark}`}>
      <Icon name="spark" size={14} filled />
      {label}
    </span>
  );
}

export interface StatusChipProps {
  stage: 'GA' | 'BETA' | 'ALPHA' | 'DEPRECATED';
}

/** Launch-stage label (read-only chip). */
export function StageChip({ stage }: StatusChipProps) {
  return <span className={`${styles.root} ${styles.stage} ${styles[stage]}`}>{stage}</span>;
}

/** Neutral read-only label with optional leading icon. */
export function Label({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className={`${styles.root} ${styles.neutral}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
