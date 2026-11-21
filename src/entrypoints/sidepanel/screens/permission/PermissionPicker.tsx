import { Icon, List, ListItem, PermissionToken, type IconName } from '@/ui/components';
import type { IamIndex } from '@/core';
import { PICKER_LIMIT } from './resolve';
import styles from './permission.module.css';

const RISK_ICON: Record<'read' | 'write' | 'admin', IconName> = {
  read: 'visibility',
  write: 'edit',
  admin: 'shield',
};

/** Several permissions match the typed fragment: pick one. */
export function PermissionPicker({
  index,
  input,
  matches,
  truncated,
  onPick,
}: {
  index: IamIndex;
  input: string;
  matches: number[];
  truncated: boolean;
  onPick: (permission: string) => void;
}) {
  return (
    <div className={styles.root}>
      <div className={styles.pickerHead}>
        <h2 className={styles.pickerTitle}>Which permission?</h2>
        <p className={styles.pickerHint}>
          <code>{input}</code> matches {truncated ? `more than ${PICKER_LIMIT}` : matches.length} permissions.
          Pick one to see the roles that grant it.
        </p>
      </div>
      <List label="Matching permissions">
        {matches.map((i, n) => {
          const p = index.permissions[i];
          const risk = index.classOf(i);
          const roles = index.roleIdxsGranting(i).length;
          return (
            <ListItem
              key={i}
              index={n}
              onClick={() => onPick(p)}
              leading={
                <span className={`${styles.verbIcon} ${styles[risk]}`} aria-hidden="true">
                  <Icon name={RISK_ICON[risk]} size={20} filled />
                </span>
              }
              headline={
                <span className={styles.tokenWrap}>
                  <PermissionToken permission={p} risk={risk} static />
                </span>
              }
              supporting={`${roles.toLocaleString('en-US')} ${roles === 1 ? 'role' : 'roles'}`}
            />
          );
        })}
      </List>
    </div>
  );
}
