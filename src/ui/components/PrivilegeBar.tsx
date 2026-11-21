import { Icon } from './Icon';
import styles from './PrivilegeBar.module.css';

export interface PrivilegeBarProps {
  read: number;
  write: number;
  admin: number;
  /** Show the icon + count legend under the bar */
  legend?: boolean;
}

const KINDS = [
  { key: 'read', icon: 'visibility' },
  { key: 'write', icon: 'edit' },
  { key: 'admin', icon: 'shield' },
] as const;

/** Segmented read/write/admin share bar. Hue is never the only signal: legend icons + aria-label. */
export function PrivilegeBar({ read, write, admin, legend = true }: PrivilegeBarProps) {
  const counts = { read, write, admin };
  const total = read + write + admin;
  return (
    <div className={styles.root}>
      <div role="img" aria-label={`${read} read, ${write} write, ${admin} admin`} className={styles.bar}>
        {KINDS.map(({ key }) =>
          counts[key] > 0 ? (
            <span key={key} className={`${styles.seg} ${styles[key]}`} style={{ flexGrow: counts[key] }} />
          ) : null,
        )}
        {total === 0 && <span className={`${styles.seg} ${styles.empty}`} style={{ flexGrow: 1 }} />}
      </div>
      {legend && (
        <ul className={styles.legend} aria-hidden="true">
          {KINDS.map(({ key, icon }) => (
            <li key={key} className={styles[`t_${key}`]}>
              <Icon name={icon} size={14} /> {counts[key]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
