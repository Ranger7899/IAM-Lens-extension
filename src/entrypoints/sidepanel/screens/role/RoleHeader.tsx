import { Button, Card, Chip, IdToken, Label, PrivilegeBar, SourceBadge, StageChip } from '@/ui/components';
import type { PrivilegeProfile, RoleRecord } from '@/core';
import { LocalIcon } from './LocalIcon';
import styles from './RoleHeader.module.css';

const STAGES = ['GA', 'BETA', 'ALPHA', 'DEPRECATED'] as const;
type Stage = (typeof STAGES)[number];
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

/** Large header card: title, ID token, stage, description, spectrum bar and the action row. */
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
  return (
    <Card variant="filled" className={styles.root} aria-label={`${role.title || role.name} summary`}>
      <div className={styles.eyebrow}>
        <StageChip stage={asStage(role.stage)} />
        {role.deleted && <Label>Deleted</Label>}
        {role.source.kind === 'custom' ? (
          <SourceBadge parent={role.source.parent} />
        ) : (
          <span>Predefined role</span>
        )}
      </div>
      <h2 className={styles.title}>{role.title || role.name}</h2>
      <IdToken value={role.name} onCopied={onCopyId} />
      {role.description && <p className={styles.desc}>{role.description}</p>}

      <div className={styles.spectrum}>
        <div className={styles.total}>
          <strong className={styles.number}>{total.toLocaleString('en-US')}</strong>
          <span>{total === 1 ? 'permission' : 'permissions'}</span>
        </div>
        <PrivilegeBar {...profile} legendStyle="full" />
      </div>

      <div className={styles.actions} role="group" aria-label="Role actions">
        <Button variant="tonal" icon="compare_arrows" onClick={onCompare} className={styles.compare}>
          Compare…
        </Button>
        <Chip
          icon="content_copy"
          onClick={onCopyPermissions}
          disabled={total === 0}
          aria-label="Copy all permissions"
        >
          Copy all
        </Chip>
        <Chip onClick={onCopyGcloud} aria-label="Copy gcloud describe command">
          <LocalIcon name="terminal" />
          gcloud
        </Chip>
        <Chip onClick={onOpenDocs} aria-label="Open official docs">
          <LocalIcon name="open_in_new" />
          Docs
        </Chip>
      </div>
    </Card>
  );
}
