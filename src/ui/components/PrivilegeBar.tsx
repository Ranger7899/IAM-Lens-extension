import { Icon, type IconName } from './Icon';
import styles from './PrivilegeBar.module.css';

export interface PrivilegeBarProps {
  read: number;
  write: number;
  admin: number;
  /** Show the icon + count legend under the bar */
  legend?: boolean;
  /** "full" adds the words (read / write / admin) next to the counts */
  legendStyle?: 'compact' | 'full';
  /** Bar thickness: thin for list rows, regular for headers */
  size?: 'thin' | 'regular';
}

const KINDS: { key: 'read' | 'write' | 'admin'; icon: IconName }[] = [
  { key: 'read', icon: 'visibility' },
  { key: 'write', icon: 'edit' },
  { key: 'admin', icon: 'shield' },
];

/** Segmented read/write/admin share bar. Hue is never the only signal: legend icons + aria-label. */
export function PrivilegeBar({
  read,
  write,
  admin,
  legend = true,
  legendStyle = 'compact',
  size = 'regular',
}: PrivilegeBarProps) {
  const counts = { read, write, admin };
  const total = read + write + admin;
  return (
    <div className={styles.root}>
      <div
        role="img"
        aria-label={`${read} read, ${write} write, ${admin} admin`}
        className={`${styles.bar} ${size === 'thin' ? styles.thin : ''}`}
      >
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
              <Icon name={icon} size={14} filled />
              <b>{counts[key].toLocaleString()}</b>
              {legendStyle === 'full' && <span>{key}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
