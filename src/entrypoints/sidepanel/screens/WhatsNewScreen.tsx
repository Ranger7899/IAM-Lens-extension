import { ErrorCard, Icon, SkeletonList } from '@/ui/components';
import { ChangedRoles, PermissionRows, RoleRows, Section } from './whatsnew/Sections';
import { WhatsNewHeader } from './whatsnew/WhatsNewHeader';
import { formatDate, shortVersion } from './whatsnew/format';
import { useWhatsNew, type WhatsNewLoader } from './whatsnew/useWhatsNew';
import styles from './whatsnew/WhatsNew.module.css';

/** `whatsnew`: roles and permissions added, removed or changed between the previous and current snapshot. */
export function WhatsNewScreen({ load }: { load?: WhatsNewLoader } = {}) {
  const s = useWhatsNew(load);

  if (s.status === 'loading') return <SkeletonList rows={5} label="Comparing snapshots" />;
  if (s.status === 'error')
    return <ErrorCard title="Couldn’t compare snapshots" detail={s.error.message} onRetry={s.retry} />;

  if (s.status === 'empty') {
    return (
      <section className={styles.empty} aria-labelledby="wn-empty">
        <span className={styles.emptyBadge} aria-hidden="true">
          <Icon name="new_releases" size={40} filled />
        </span>
        <h2 id="wn-empty" className={styles.emptyTitle}>
          Nothing to compare yet
        </h2>
        <p className={styles.emptyText}>
          You&rsquo;re on the bundled snapshot; changes appear after the first daily update.
        </p>
        <p className={styles.emptyMeta}>
          Current snapshot <code>{shortVersion(s.current.version)}</code> &middot;{' '}
          {formatDate(s.current.generatedAt)}
        </p>
      </section>
    );
  }

  const { diff } = s;
  const none =
    !diff.rolesAdded.length &&
    !diff.rolesRemoved.length &&
    !diff.rolesChanged.length &&
    !diff.permissionsAdded.length &&
    !diff.permissionsRemoved.length;

  return (
    <article className={styles.root} aria-label="What’s new">
      <WhatsNewHeader previous={s.previous} current={s.current} diff={diff} />
      {none && <p className={styles.none}>The two snapshots are identical.</p>}
      <Section title="Roles added" tone="added" count={diff.rolesAdded.length}>
        <RoleRows roles={diff.rolesAdded} linked label="Roles added" />
      </Section>
      <Section title="Roles changed" tone="changed" count={diff.rolesChanged.length}>
        <ChangedRoles changes={diff.rolesChanged} />
      </Section>
      <Section title="Roles removed" tone="removed" count={diff.rolesRemoved.length}>
        <RoleRows roles={diff.rolesRemoved} linked={false} label="Roles removed" />
      </Section>
      <Section title="Permissions added" tone="added" count={diff.permissionsAdded.length}>
        <PermissionRows perms={diff.permissionsAdded} linked label="Permissions added" />
      </Section>
      <Section title="Permissions removed" tone="removed" count={diff.permissionsRemoved.length}>
        <PermissionRows perms={diff.permissionsRemoved} linked={false} label="Permissions removed" />
      </Section>
    </article>
  );
}
