import { Card, IconButton, LeastPrivilegeBadge, List, PermissionAnatomy } from '../components';
import type { PermissionDetailData, RoleSummary } from '../types';
import { RoleRow, SectionHeader, total } from './parts';
import styles from './PermissionDetail.module.css';

export interface PermissionDetailProps {
  permission: PermissionDetailData;
  onBack: () => void;
  onOpenRole: (id: string) => void;
  onCopy?: (text: string) => void;
}

const RISK_NOTE = {
  read: 'Reads data or metadata. Cannot change anything.',
  write: 'Creates or changes resources.',
  admin: 'Deletes resources or changes who has access.',
} as const;

export function PermissionDetail({ permission, onBack, onOpenRole, onCopy }: PermissionDetailProps) {
  // Smallest role first: that is the least-privilege answer.
  const roles: RoleSummary[] = [...permission.grantedBy].sort((a, b) => total(a.counts) - total(b.counts));
  return (
    <article className={styles.root} aria-label={permission.id}>
      <div className={styles.bar}>
        <IconButton icon="arrow_back" label="Back to results" onClick={onBack} />
        <IconButton
          icon="content_copy"
          label={`Copy ${permission.id}`}
          onClick={() => {
            void navigator.clipboard?.writeText(permission.id).catch(() => {});
            onCopy?.(permission.id);
          }}
        />
      </div>
      <Card variant="filled" className={styles.header}>
        <span className={styles.kind}>Permission</span>
        <PermissionAnatomy permission={permission.id} risk={permission.risk} />
        <p className={styles.desc}>{permission.description ?? RISK_NOTE[permission.risk]}</p>
      </Card>
      <SectionHeader title="Granted by" count={roles.length} />
      <List label="Roles granting this permission">
        {roles.map((role, i) => (
          <RoleRow
            key={role.id}
            role={role}
            index={i}
            onOpen={onOpenRole}
            badge={i === 0 && roles.length > 1 ? <LeastPrivilegeBadge /> : undefined}
          />
        ))}
      </List>
    </article>
  );
}
