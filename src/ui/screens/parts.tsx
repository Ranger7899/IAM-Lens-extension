import type { ReactNode } from 'react';
import { ListItem, Monogram, PrivilegeBar, StageChip } from '../components';
import type { RoleSummary } from '../types';
import styles from './parts.module.css';

export function SectionHeader({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {title}
        {count !== undefined && <span className={styles.count}>{count}</span>}
      </h2>
      {action}
    </div>
  );
}

export function total(c: { read: number; write: number; admin: number }) {
  return c.read + c.write + c.admin;
}

export interface RoleRowProps {
  role: RoleSummary;
  index?: number;
  onOpen?: (id: string) => void;
  /** Slot shown at the end of the title line, e.g. the least-privilege badge */
  badge?: ReactNode;
}

/** One role in a list: monogram, title, ID in mono, thin spectrum bar, permission count. */
export function RoleRow({ role, index, onOpen, badge }: RoleRowProps) {
  const n = total(role.counts);
  return (
    <ListItem
      index={index}
      onClick={onOpen && (() => onOpen(role.id))}
      leading={<Monogram id={role.id} />}
      headline={role.title}
      supporting={<span className={styles.mono}>{role.id}</span>}
      trailing={
        <span className={styles.num} title="permissions">
          {n.toLocaleString('en-US')}
        </span>
      }
      extra={
        <>
          {(badge || role.stage !== 'GA') && (
            <span className={styles.badgeRow}>
              {badge}
              {role.stage !== 'GA' && <StageChip stage={role.stage} />}
            </span>
          )}
          <PrivilegeBar {...role.counts} legend={false} size="thin" />
        </>
      }
    />
  );
}
