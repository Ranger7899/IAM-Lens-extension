import { Icon, type IconName } from './Icon';
import type { Risk } from '../types';
import styles from './PermissionAnatomy.module.css';

const RISK: Record<Risk, { icon: IconName; label: string }> = {
  read: { icon: 'visibility', label: 'Read' },
  write: { icon: 'edit', label: 'Write' },
  admin: { icon: 'shield', label: 'Admin' },
};

/** The signature element: service.resource.verb laid out large, each part bracketed and labelled. */
export function PermissionAnatomy({ permission, risk }: { permission: string; risk: Risk }) {
  const parts = permission.split('.');
  const service = parts[0];
  const verb = parts.length > 1 ? parts[parts.length - 1] : '';
  const resource = parts.slice(1, -1).join('.');
  const r = RISK[risk];
  return (
    <figure
      className={styles.root}
      aria-label={`${permission}: service ${service}, resource ${resource}, verb ${verb}, ${r.label}`}
    >
      <div className={styles.parts} aria-hidden="true">
        <span className={`${styles.part} ${styles.service}`}>
          <span className={styles.text}>{service}</span>
          <span className={styles.label}>service</span>
        </span>
        {resource && (
          <span className={`${styles.part} ${styles.resource}`}>
            <span className={styles.text}>.{resource}</span>
            <span className={styles.label}>resource</span>
          </span>
        )}
        {verb && (
          <span className={`${styles.part} ${styles.verb} ${styles[risk]}`}>
            <span className={styles.text}>.{verb}</span>
            <span className={styles.label}>
              <Icon name={r.icon} size={12} filled /> verb · {r.label}
            </span>
          </span>
        )}
      </div>
    </figure>
  );
}
