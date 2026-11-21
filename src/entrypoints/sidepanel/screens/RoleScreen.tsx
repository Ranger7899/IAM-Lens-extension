import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Button, Chip, Icon, Snackbar } from '@/ui/components';
import { useIam } from '@/ui/data';
import type { PrivilegeClass, ServiceGroup } from '@/core';
import { RoleHeader } from './role/RoleHeader';
import { RoleNotFound } from './role/RoleNotFound';
import { ServiceSection } from './role/ServiceSection';
import { docsUrl, gcloudDescribe } from './role/roleLinks';
import { useNavigate } from '../navigation';
import styles from './role/RoleScreen.module.css';

const RISKS: { id: PrivilegeClass; label: string; icon: 'visibility' | 'edit' | 'shield' }[] = [
  { id: 'read', label: 'Read', icon: 'visibility' },
  { id: 'write', label: 'Write', icon: 'edit' },
  { id: 'admin', label: 'Admin', icon: 'shield' },
];

/** Groups with at most this many permissions in total start expanded; bigger roles start collapsed. */
const AUTO_OPEN_TOTAL = 160;

/** `role/:name`: everything about one role. */
export function RoleScreen({ name }: { name: string }) {
  const iam = useIam();
  if (iam.status !== 'ready') return null; // IamGate normally guards this
  return <RoleView key={name} index={iam.index} name={name} />;
}

function RoleView({ index, name }: { index: NonNullable<ReturnType<typeof useIam>['index']>; name: string }) {
  const { go } = useNavigate();
  const role = useMemo(() => index.findRole(name), [index, name]);
  const groups = useMemo(() => (role ? index.permissionsByService(role) : []), [index, role]);
  const profile = useMemo(
    () => (role ? index.profile(role) : { read: 0, write: 0, admin: 0 }),
    [index, role],
  );

  const [text, setText] = useState('');
  const [risks, setRisks] = useState<ReadonlySet<PrivilegeClass>>(new Set());
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const closeSnack = useCallback(() => setMessage(null), []);

  const query = useDeferredValue(text.trim().toLowerCase());
  const filtering = query !== '' || risks.size > 0;

  const visible = useMemo(() => {
    return groups
      .map((g: ServiceGroup) => {
        if (!filtering) return { group: g, indices: g.indices };
        const indices = g.indices.filter(
          (idx, i) =>
            (risks.size === 0 || risks.has(index.classOf(idx))) &&
            (query === '' || g.permissions[i].toLowerCase().includes(query)),
        );
        return { group: g, indices };
      })
      .filter((v) => v.indices.length > 0);
  }, [groups, index, query, risks, filtering]);

  const shownTotal = useMemo(() => visible.reduce((n, v) => n + v.indices.length, 0), [visible]);

  if (!role) return <RoleNotFound name={name} />;

  const total = profile.read + profile.write + profile.admin;
  const defaultOpen = (shownCount: number) =>
    shownCount <= AUTO_OPEN_TOTAL && (filtering || total <= AUTO_OPEN_TOTAL || groups.length === 1);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied`);
    } catch {
      setMessage(`Couldn’t copy ${label.toLowerCase()}`);
    }
  }

  const toggleRisk = (id: PrivilegeClass) =>
    setRisks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allOpen =
    visible.length > 0 && visible.every((v) => toggled[v.group.service] ?? defaultOpen(v.indices.length));
  const setAll = (open: boolean) => setToggled(Object.fromEntries(groups.map((g) => [g.service, open])));

  return (
    <article className={styles.root} aria-label={role.title || role.name}>
      <RoleHeader
        role={role}
        profile={profile}
        onCopyId={() => setMessage('Role ID copied')}
        onCopyPermissions={() =>
          void copy(
            index
              .permissionsByService(role)
              .flatMap((g) => g.permissions)
              .join('\n'),
            `${total.toLocaleString('en-US')} permissions`,
          )
        }
        onCopyGcloud={() => void copy(gcloudDescribe(role), 'gcloud command')}
        onOpenDocs={() => window.open(docsUrl(role), '_blank', 'noopener,noreferrer')}
        onCompare={() => go({ name: 'compare', a: role.name })}
      />

      {total > 0 && (
        <div className={styles.toolbar}>
          <label className={styles.filter}>
            <Icon name="filter_alt" className={styles.filterIcon} />
            <span className={styles.filterLabel} aria-hidden="true">
              Filter
            </span>
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter property name or value"
              aria-label="Filter permissions in this role"
              className={styles.filterInput}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className={styles.chips} role="group" aria-label="Filter by privilege">
            {RISKS.map((r) => (
              <Chip
                key={r.id}
                kind="filter"
                icon={r.icon}
                selected={risks.has(r.id)}
                title={`${profile[r.id].toLocaleString('en-US')} ${r.id}`}
                disabled={profile[r.id] === 0}
                onClick={() => toggleRisk(r.id)}
              >
                {r.label}
              </Chip>
            ))}
          </div>
          <div className={styles.summary} aria-live="polite">
            <span>
              {filtering
                ? `${shownTotal.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} permissions`
                : `${groups.length} ${groups.length === 1 ? 'service' : 'services'}`}
            </span>
            {visible.length > 1 && (
              <Button variant="text" onClick={() => setAll(!allOpen)}>
                {allOpen ? 'Collapse all' : 'Expand all'}
              </Button>
            )}
          </div>
        </div>
      )}

      {total === 0 && <p className={styles.empty}>This role grants no permissions.</p>}
      {total > 0 && visible.length === 0 && (
        <div className={styles.empty}>
          <p>No permissions match{query ? ` “${text.trim()}”` : ''}.</p>
          <Button
            variant="text"
            onClick={() => {
              setText('');
              setRisks(new Set());
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {visible.length > 0 && (
        <div className={styles.thead} aria-hidden="true">
          <span>Permission</span>
          <span>Type</span>
        </div>
      )}
      {visible.map(({ group, indices }, gi) => (
        <ServiceSection
          key={group.service}
          index={index}
          service={group.service}
          indices={indices}
          total={group.indices.length}
          open={toggled[group.service] ?? defaultOpen(indices.length)}
          onToggle={() =>
            setToggled((t) => ({ ...t, [group.service]: !(t[group.service] ?? defaultOpen(indices.length)) }))
          }
          order={gi}
        />
      ))}
      <Snackbar message={message} onClose={closeSnack} />
    </article>
  );
}
