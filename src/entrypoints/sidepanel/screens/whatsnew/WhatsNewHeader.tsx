import { Icon } from '@/ui/components';
import type { SnapshotDiff } from '@/core';
import { formatDate, n, shortVersion } from './format';
import type { SnapshotInfo } from './useWhatsNew';
import styles from './WhatsNew.module.css';

export interface WhatsNewHeaderProps {
  previous: SnapshotInfo;
  current: SnapshotInfo;
  diff: SnapshotDiff;
}

const STATS = [
  { key: 'rolesAdded', label: 'roles added', tone: 'added' },
  { key: 'rolesRemoved', label: 'roles removed', tone: 'removed' },
  { key: 'rolesChanged', label: 'roles changed', tone: 'changed' },
  { key: 'permissionsAdded', label: 'permissions added', tone: 'added' },
  { key: 'permissionsRemoved', label: 'permissions removed', tone: 'removed' },
] as const;

/** Big header card: the two snapshot versions with dates, and one stat tile per section. */
export function WhatsNewHeader({ previous, current, diff }: WhatsNewHeaderProps) {
  const total = STATS.reduce((sum, s) => sum + diff[s.key].length, 0);
  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>
        <Icon name="new_releases" size={16} filled /> What&rsquo;s new
      </p>
      <h2 className={styles.headline}>
        {total === 0
          ? 'No changes between snapshots'
          : `${n(total)} ${total === 1 ? 'change' : 'changes'} since the last update`}
      </h2>
      <div className={styles.versions} aria-label="Snapshots compared">
        <Snap label="Before" snap={previous} />
        <span className={styles.arrow} aria-hidden="true">
          <Icon name="chevron_right" size={20} />
        </span>
        <Snap label="Now" snap={current} strong />
      </div>
      {total > 0 && (
        <ul className={styles.stats} aria-label="Summary">
          {STATS.filter((s) => diff[s.key].length > 0).map((s) => (
            <li key={s.key} className={`${styles.stat} ${styles[s.tone]}`}>
              <span className={styles.statNum}>{n(diff[s.key].length)}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

function Snap({ label, snap, strong }: { label: string; snap: SnapshotInfo; strong?: boolean }) {
  return (
    <div className={`${styles.snap} ${strong ? styles.snapNow : ''}`}>
      <span className={styles.snapLabel}>{label}</span>
      <span className={styles.snapDate}>{formatDate(snap.generatedAt)}</span>
      <code className={styles.snapVersion}>{shortVersion(snap.version)}</code>
    </div>
  );
}
