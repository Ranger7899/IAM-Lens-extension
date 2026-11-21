import { useState, type ReactNode } from 'react';
import { StageChip, PermissionToken, Icon } from '@/ui/components';
import { classifyPermission, type RoleChange, type RoleSummary } from '@/core';
import { routeHref } from '../../router';
import { n } from './format';
import styles from './WhatsNew.module.css';

type Tone = 'added' | 'removed' | 'changed';

const PAGE = 25;

/** Titled section with a count badge. Renders nothing when empty. */
export function Section({
  title,
  tone,
  count,
  children,
}: {
  title: string;
  tone: Tone;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  const id = `wn-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 id={id} className={styles.sectionTitle}>
        <span className={`${styles.sectionDot} ${styles[tone]}`} aria-hidden="true" />
        {title}
        <span className={`${styles.count} ${styles[tone]}`}>{n(count)}</span>
      </h3>
      {children}
    </section>
  );
}

/** Shows the first PAGE items, then a "Show more" button, so huge diffs never render thousands of rows at once. */
function Paged<T>({
  items,
  render,
  label,
}: {
  items: readonly T[];
  render: (item: T, i: number) => ReactNode;
  label: string;
}) {
  const [shown, setShown] = useState(PAGE);
  return (
    <>
      <ul className={styles.rows} aria-label={label}>
        {items.slice(0, shown).map(render)}
      </ul>
      {shown < items.length && (
        <button type="button" className={styles.more} onClick={() => setShown((s) => s + PAGE * 4)}>
          Show {n(Math.min(PAGE * 4, items.length - shown))} more
          <span className={styles.moreOf}>of {n(items.length - shown)} remaining</span>
        </button>
      )}
    </>
  );
}

function RoleName({ role }: { role: Pick<RoleSummary, 'name' | 'title'> }) {
  return (
    <span className={styles.roleText}>
      <span className={styles.roleTitle}>{role.title || role.name}</span>
      <code className={styles.roleId}>{role.name}</code>
    </span>
  );
}

export function RoleRows({
  roles,
  linked,
  label,
}: {
  roles: readonly RoleSummary[];
  linked: boolean;
  label: string;
}) {
  return (
    <Paged
      items={roles}
      label={label}
      render={(r, i) => {
        const body = (
          <>
            <RoleName role={r} />
            <span className={styles.meta}>
              {r.stage !== 'GA' && <StageChip stage={r.stage as 'BETA'} />}
              <span className={styles.permCount}>{n(r.permissionCount)} perms</span>
            </span>
          </>
        );
        return (
          <li
            key={r.name}
            className={`${styles.row} reveal`}
            style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
          >
            {linked ? (
              <a className={styles.rowMain} href={routeHref({ name: 'role', id: r.name })}>
                {body}
              </a>
            ) : (
              <div className={`${styles.rowMain} ${styles.gone}`}>{body}</div>
            )}
          </li>
        );
      }}
    />
  );
}

function PermList({ perms, sign, linked }: { perms: string[]; sign: '+' | '−'; linked: boolean }) {
  const [all, setAll] = useState(false);
  const LIMIT = 6;
  const shown = all ? perms : perms.slice(0, LIMIT);
  return (
    <ul className={styles.perms} aria-label={sign === '+' ? 'Permissions added' : 'Permissions removed'}>
      {shown.map((p) => (
        <li key={p} className={styles.permItem}>
          <span
            className={`${styles.sign} ${sign === '+' ? styles.added : styles.removed}`}
            aria-hidden="true"
          >
            {sign}
          </span>
          <PermLink name={p} linked={linked} />
        </li>
      ))}
      {perms.length > LIMIT && (
        <li>
          <button type="button" className={styles.linkBtn} onClick={() => setAll(!all)}>
            {all ? 'Show fewer' : `Show all ${n(perms.length)}`}
          </button>
        </li>
      )}
    </ul>
  );
}

/** A permission token that opens its detail screen. Removed permissions no longer exist, so they are plain. */
export function PermLink({ name, linked }: { name: string; linked: boolean }) {
  const token = <PermissionToken permission={name} risk={classifyPermission(name)} static />;
  return linked ? (
    <a className={styles.permLink} href={routeHref({ name: 'permission', id: name })}>
      {token}
    </a>
  ) : (
    <span className={`${styles.permLink} ${styles.gone}`}>{token}</span>
  );
}

export function ChangedRoles({ changes }: { changes: readonly RoleChange[] }) {
  return (
    <Paged
      items={changes}
      label="Roles changed"
      render={(c, i) => (
        <li
          key={c.name}
          className={`${styles.changedItem} reveal`}
          style={{ '--i': Math.min(i, 8) } as React.CSSProperties}
        >
          <a className={styles.changedHead} href={routeHref({ name: 'role', id: c.name })}>
            <RoleName role={c} />
            <Icon name="chevron_right" size={20} className={styles.chev} />
          </a>
          <div className={styles.chips}>
            {c.stage && (
              <span className={styles.stageChange}>
                <StageChip stage={c.stage.from as 'GA'} />
                <span aria-label="became">→</span>
                <StageChip stage={c.stage.to as 'GA'} />
              </span>
            )}
            {c.deleted && (
              <span className={`${styles.pill} ${c.deleted.to ? styles.removed : styles.added}`}>
                {c.deleted.to ? 'Deleted' : 'Restored'}
              </span>
            )}
            {c.addedPermissions.length > 0 && (
              <span className={`${styles.pill} ${styles.added}`}>
                +{n(c.addedPermissions.length)} permissions
              </span>
            )}
            {c.removedPermissions.length > 0 && (
              <span className={`${styles.pill} ${styles.removed}`}>
                −{n(c.removedPermissions.length)} permissions
              </span>
            )}
          </div>
          {c.addedPermissions.length > 0 && <PermList perms={c.addedPermissions} sign="+" linked />}
          {c.removedPermissions.length > 0 && <PermList perms={c.removedPermissions} sign="−" linked />}
        </li>
      )}
    />
  );
}

export function PermissionRows({
  perms,
  linked,
  label,
}: {
  perms: readonly string[];
  linked: boolean;
  label: string;
}) {
  return (
    <Paged
      items={perms}
      label={label}
      render={(p) => (
        <li key={p} className={styles.permRow}>
          <PermLink name={p} linked={linked} />
        </li>
      )}
    />
  );
}
