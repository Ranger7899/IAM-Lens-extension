import { Button, Icon, IconButton } from '@/ui/components';
import { plural, relativeTime } from '@/ui/data/syncFormat';
import { summarize, type SourceRecord, type SyncDeps } from '@/ui/data/customSync';
import { realSyncDeps } from '@/ui/data/customSyncDeps';
import { useCustomSync } from '@/ui/data/useCustomSync';
import styles from './CustomSyncRow.module.css';

/** "12 roles from 4 projects and 1 organization". */
export function describeSources(sources: readonly SourceRecord[]): string {
  const s = summarize(sources);
  if (!s.roles) return 'no custom roles found';
  const from = [
    s.projects ? plural(s.projects, 'project') : '',
    s.organizations ? plural(s.organizations, 'organization') : '',
  ].filter(Boolean);
  return `${s.roles.toLocaleString('en')} from ${from.join(' and ')}`;
}

/**
 * Front-page status of the custom-roles sync, only while signed in. Also drives the automatic refresh
 * (on mount when older than an hour, then hourly while the panel is open).
 */
export function CustomSyncRow({ deps = realSyncDeps }: { deps?: SyncDeps }) {
  const s = useCustomSync(deps, { auto: true });
  if (s.signedIn !== true) return null;

  const needsSignIn = s.authError !== null;
  let status: string;
  if (s.syncing) status = 'Syncing…';
  else if (needsSignIn) status = 'Session ended';
  else if (!s.syncedAt) status = 'Not synced yet';
  else status = `${describeSources(s.sources)} · synced ${relativeTime(s.syncedAt)}`;

  return (
    <div className={styles.row} role="status" aria-live="polite" data-custom-sync>
      <Icon name="key" size={16} />
      <span className={styles.text}>
        <span className={styles.label}>Custom roles</span>
        <span aria-hidden="true"> · </span>
        <span>{status}</span>
        {s.error && !s.syncing && !needsSignIn && (
          <span className={styles.err} title={s.error.message}>
            {' · '}Couldn&apos;t refresh
          </span>
        )}
      </span>
      {needsSignIn && !s.syncing ? (
        <Button variant="text" onClick={() => void chrome.runtime.openOptionsPage()}>
          Sign in again
        </Button>
      ) : (
        <IconButton
          icon="refresh"
          size="sm"
          label={s.syncing ? 'Syncing…' : 'Refresh custom roles'}
          disabled={s.syncing}
          className={s.syncing ? styles.spin : undefined}
          onClick={() => void s.syncNow()}
        />
      )}
    </div>
  );
}
