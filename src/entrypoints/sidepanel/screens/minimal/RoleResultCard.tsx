import { Chip, IdToken, PermissionToken, PrivilegeBar, StageChip, Icon, type Risk } from '@/ui/components';
import type { ChosenRole, PrivilegeProfile } from '@/core';
import { LocalIcon } from '../role/LocalIcon';
import styles from './minimal.module.css';

const STAGES = ['GA', 'BETA', 'ALPHA', 'DEPRECATED'] as const;
type Stage = (typeof STAGES)[number];
const asStage = (s: string): Stage => ((STAGES as readonly string[]).includes(s) ? (s as Stage) : 'GA');

export interface RoleResultCardProps {
  n: number;
  chosen: ChosenRole;
  profile: PrivilegeProfile;
  riskOf: (perm: string) => Risk | undefined;
  onCopyId: () => void;
  onCopyGcloud: () => void;
  order: number;
}

/** One chosen role: numbered badge, ID, size, privilege bar, the requested permissions it grants. */
export function RoleResultCard({
  n,
  chosen,
  profile,
  riskOf,
  onCopyId,
  onCopyGcloud,
  order,
}: RoleResultCardProps) {
  const { role } = chosen;
  const total = role.perms.length;
  return (
    <article
      className={styles.role}
      aria-label={role.title || role.name}
      style={{ ['--i' as string]: Math.min(order, 6) }}
    >
      <header className={styles.roleHead}>
        <span className={styles.num} aria-hidden="true">
          {n}
        </span>
        <div className={styles.roleTitle}>
          <h3>{role.title || role.name}</h3>
          <IdToken value={role.name} onCopied={onCopyId} />
        </div>
        <StageChip stage={asStage(role.stage)} />
      </header>

      {chosen.discouraged && (
        <p className={styles.warn} role="note">
          <Icon name="error" size={18} filled />
          <span>
            {role.deleted ? 'Deleted' : 'Deprecated'} role, used only because nothing else grants these. Avoid
            it for new bindings.
          </span>
        </p>
      )}

      <div className={styles.meter}>
        <div className={styles.size}>
          <strong>{total.toLocaleString('en-US')}</strong>
          <span>{total === 1 ? 'permission in role' : 'permissions in role'}</span>
        </div>
        <PrivilegeBar {...profile} size="thin" />
      </div>

      <div className={styles.grants}>
        <div className={styles.grantsHead}>
          <p className={styles.eyebrow}>Covers {chosen.grants.length} of yours</p>
          <Chip onClick={onCopyGcloud} aria-label={`Copy gcloud binding for ${role.name}`}>
            <LocalIcon name="terminal" />
            gcloud
          </Chip>
        </div>
        <ul className={styles.chips} aria-label={`Permissions granted by ${role.name}`}>
          {chosen.grants.map((p) => (
            <li key={p}>
              <PermissionToken permission={p} risk={riskOf(p)} static />
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
