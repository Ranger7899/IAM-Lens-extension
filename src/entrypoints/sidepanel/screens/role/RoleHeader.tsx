import { Button, IdToken, Label, PrivilegeBar, SourceBadge, StageChip } from '@/ui/components';
import type { PrivilegeProfile, RoleRecord } from '@/core';
import { LocalIcon } from './LocalIcon';
import styles from './RoleHeader.module.css';

const STAGES = ['GA', 'BETA', 'ALPHA', 'DEPRECATED'] as const;
type Stage = (typeof STAGES)[number];
const STAGE_LABEL: Record<Stage, string> = {
  GA: 'General availability',
  BETA: 'Beta',
  ALPHA: 'Alpha',
  DEPRECATED: 'Deprecated',
};
const asStage = (s: string): Stage => ((STAGES as readonly string[]).includes(s) ? (s as Stage) : 'GA');

export interface RoleHeaderProps {
  role: RoleRecord;
  profile: PrivilegeProfile;
  onCopyId: (id: string) => void;
  onCopyPermissions: () => void;
  onCopyGcloud: () => void;
  onOpenDocs: () => void;
  onCompare: () => void;
}

/** Console role details: title row, outlined action buttons, key/value block, then the permission total. */
export function RoleHeader({
  role,
  profile,
  onCopyId,
  onCopyPermissions,
  onCopyGcloud,
  onOpenDocs,
  onCompare,
}: RoleHeaderProps) {
  const total = profile.read + profile.write + profile.admin;
  const stage = asStage(role.stage);
  return (
    <section className={styles.root} aria-label={`${role.title || role.name} summary`}>
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{role.title || role.name}</h2>
        {stage !== 'GA' && <StageChip stage={stage} />}
        {role.deleted && <Label>Deleted</Label>}
      </div>

      <div className={styles.actions} role="group" aria-label="Role actions">
        <Button onClick={onCompare}>Compare…</Button>
        <Button
          variant="text"
          onClick={onCopyPermissions}
          disabled={total === 0}
          aria-label="Copy all permissions"
        >
          Copy all
        </Button>
        <Button variant="text" onClick={onCopyGcloud} aria-label="Copy gcloud describe command">
          <LocalIcon name="terminal" />
          gcloud
        </Button>
        <Button variant="text" onClick={onOpenDocs} aria-label="Open official docs">
          <LocalIcon name="open_in_new" />
          Docs
        </Button>
      </div>

      <dl className={styles.kv}>
        <dt>ID</dt>
        <dd>
          <IdToken value={role.name} onCopied={onCopyId} />
        </dd>
        <dt>Role launch stage</dt>
        <dd>{STAGE_LABEL[stage]}</dd>
        {role.source.kind === 'custom' && (
          <>
            <dt>Source</dt>
            <dd>
              <SourceBadge parent={role.source.parent} />
            </dd>
          </>
        )}
        {role.description && (
          <>
            <dt>Description</dt>
            <dd>{role.description}</dd>
          </>
        )}
      </dl>

      <h3 className={styles.assigned}>
        <strong>{total.toLocaleString('en-US')}</strong> assigned {total === 1 ? 'permission' : 'permissions'}
      </h3>
      <PrivilegeBar {...profile} legendStyle="full" />
    </section>
  );
}
