import { useMemo, useState } from 'react';
import { IconButton } from '@/ui/components';
import type { IamIndex } from '@/core';
import { permissionService } from '@/core';
import { ServiceSection } from '../role/ServiceSection';
import styles from './compare.module.css';

/** Sections with more permissions than this start with every service collapsed. */
export const AUTO_OPEN_TOTAL = 60;
/** Service headers shown before "Show more services". */
export const SERVICE_PAGE = 12;

export type DiffKind = 'onlyA' | 'onlyB' | 'shared';

export interface DiffSectionProps {
  index: IamIndex;
  kind: DiffKind;
  title: string;
  /** Short caption under the title, e.g. the role name. */
  caption?: string;
  permissions: readonly string[];
  onCopy: () => void;
}

/** One third of the three-way diff: count, copy button and permissions grouped by service. */
export function DiffSection({ index, kind, title, caption, permissions, onCopy }: DiffSectionProps) {
  const groups = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const p of permissions) {
      const idx = index.permissionIndex(p);
      if (idx === undefined) continue;
      const svc = permissionService(p);
      const list = map.get(svc);
      if (list) list.push(idx);
      else map.set(svc, [idx]);
    }
    return [...map].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }, [index, permissions]);

  const total = permissions.length;
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [services, setServices] = useState(SERVICE_PAGE);
  const defaultOpen = total <= AUTO_OPEN_TOTAL;
  const allOpen = groups.length > 0 && groups.every(([s]) => toggled[s] ?? defaultOpen);

  return (
    <section
      className={`${styles.diff} ${styles[kind]} ${total === 0 ? styles.zero : ''}`}
      aria-label={title}
    >
      <header className={styles.diffHead}>
        <span className={styles.diffDot} aria-hidden="true" />
        <div className={styles.diffTitles}>
          <h3 className={styles.diffTitle}>{title}</h3>
          {caption && <p className={styles.diffCaption}>{caption}</p>}
        </div>
        <span className={styles.diffCount} aria-label={`${total} permissions`}>
          {total.toLocaleString('en-US')}
        </span>
        <IconButton
          icon="content_copy"
          label={`Copy ${title.toLowerCase()} permissions`}
          size="sm"
          disabled={total === 0}
          onClick={onCopy}
        />
      </header>
      {total === 0 ? (
        <p className={styles.diffEmpty}>Nothing here.</p>
      ) : (
        <>
          <div className={styles.diffTools}>
            <span>
              {groups.length} {groups.length === 1 ? 'service' : 'services'}
            </span>
            {groups.length > 1 && (
              <button
                type="button"
                className={styles.link}
                onClick={() => setToggled(Object.fromEntries(groups.map(([s]) => [s, !allOpen])))}
              >
                {allOpen ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
          <div className={styles.thead} aria-hidden="true">
            <span>Permission</span>
            <span>Type</span>
            <span>Service</span>
          </div>
          {groups.slice(0, services).map(([service, indices], gi) => (
            <ServiceSection
              key={service}
              index={index}
              service={service}
              indices={indices}
              total={indices.length}
              open={toggled[service] ?? defaultOpen}
              onToggle={() => setToggled((t) => ({ ...t, [service]: !(t[service] ?? defaultOpen) }))}
              order={gi}
            />
          ))}
          {groups.length > services && (
            <button
              type="button"
              className={styles.moreServices}
              onClick={() => setServices((n) => n + SERVICE_PAGE * 4)}
            >
              Show more services
              <span>{(groups.length - services).toLocaleString('en-US')} left</span>
            </button>
          )}
        </>
      )}
    </section>
  );
}
