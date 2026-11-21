import { useState } from 'react';
import type { IamIndex } from '@/core';
import {
  Button,
  Chip,
  Icon,
  Label,
  LeastPrivilegeBadge,
  List,
  PermissionAnatomy,
  SegmentedButton,
  Snackbar,
  useCopy,
  type IconName,
} from '@/ui/components';
import { RoleRow } from '@/ui/screens/parts';
import type { RoleSummary, Stage } from '@/ui/types';
import { grantingRoles, isHiddenByDefault } from './resolve';
import styles from './permission.module.css';

const RISK: Record<'read' | 'write' | 'admin', { icon: IconName; label: string }> = {
  read: { icon: 'visibility', label: 'Read' },
  write: { icon: 'edit', label: 'Write' },
  admin: { icon: 'shield', label: 'Admin' },
};

const ORDERS = [
  { id: 'service', label: 'Same service first' },
  { id: 'size', label: 'Smallest overall' },
];

const STAGES = new Set(['GA', 'BETA', 'ALPHA', 'DEPRECATED']);

export function PermissionDetailView({
  index,
  permIdx,
  onOpenRole,
}: {
  index: IamIndex;
  permIdx: number;
  onOpenRole: (name: string) => void;
}) {
  const permission = index.permissions[permIdx];
  const risk = index.classOf(permIdx);
  const [hide, setHide] = useState(true);
  const [order, setOrder] = useState<'service' | 'size'>('service');
  const [toast, setToast] = useState<string | null>(null);
  const { copy } = useCopy();
  const { all, leastPrivilegeName } = grantingRoles(index, permIdx, order === 'service');
  const shown = hide ? all.filter((r) => !isHiddenByDefault(r)) : all;
  const hidden = all.length - all.filter((r) => !isHiddenByDefault(r)).length;
  const service = permission.split(/[./]/)[0];
  const r = RISK[risk];

  return (
    <article className={styles.root} aria-label={permission}>
      <div className={`${styles.header} ${styles[risk]}`}>
        <div className={styles.kindRow}>
          <span className={styles.kind}>Permission</span>
          <Button
            variant="tonal"
            icon="content_copy"
            aria-label={`Copy ${permission}`}
            onClick={async () => {
              if (await copy(permission)) setToast(`Copied ${permission}`);
            }}
          >
            Copy
          </Button>
        </div>
        <PermissionAnatomy permission={permission} risk={risk} />
        <div className={styles.meta}>
          <span className={`${styles.risk} ${styles[risk]}`}>
            <Icon name={r.icon} size={14} filled />
            {r.label}
          </span>
          <Label icon="key">{service}</Label>
        </div>
        <p className={styles.granted}>
          Granted by <b>{all.length.toLocaleString('en-US')}</b> {all.length === 1 ? 'role' : 'roles'}
        </p>
      </div>

      <div className={styles.toolbar}>
        <h2 className={styles.toolbarTitle}>
          Roles
          <span className={styles.count}>{shown.length}</span>
        </h2>
        {hidden > 0 || !hide ? (
          <Chip kind="filter" selected={hide} onClick={() => setHide((h) => !h)}>
            Hide deprecated &amp; agents
          </Chip>
        ) : null}
      </div>
      <div className={styles.orderRow}>
        <span className={styles.orderLabel}>Order</span>
        <SegmentedButton
          label="Order"
          segments={ORDERS}
          value={order}
          onChange={(id) => setOrder(id as 'service' | 'size')}
        />
      </div>
      {hide && hidden > 0 && (
        <p className={styles.note}>
          {hidden} deprecated, deleted or service-agent {hidden === 1 ? 'role' : 'roles'} hidden.
        </p>
      )}

      {shown.length === 0 ? (
        <p className={styles.empty}>No role grants this permission.</p>
      ) : (
        <List label="Roles granting this permission">
          {shown.map((role, i) => {
            const c = index.profile(role);
            const summary: RoleSummary = {
              id: role.name,
              title: role.title || role.name,
              stage: role.deleted ? 'DEPRECATED' : STAGES.has(role.stage) ? (role.stage as Stage) : 'GA',
              counts: c,
              customParent: role.source.kind === 'custom' ? role.source.parent : undefined,
            };
            return (
              <RoleRow
                key={role.name}
                role={summary}
                index={i}
                onOpen={onOpenRole}
                badge={role.name === leastPrivilegeName ? <LeastPrivilegeBadge /> : undefined}
              />
            );
          })}
        </List>
      )}
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </article>
  );
}
