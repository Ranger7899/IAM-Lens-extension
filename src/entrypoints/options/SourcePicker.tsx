import { useEffect, useMemo, useState } from 'react';
import type { GcpResource } from '@/core/gcp';
import { Button, Icon, List, ListItem, SearchBar, SegmentedButton, SkeletonList } from '@/ui/components';
import type { OptionsDeps } from './deps';
import { describeError, plural, type SourceError } from './format';
import type { SourceRecord } from './sources';
import { parentOf } from './sources';
import styles from './SourcePicker.module.css';

type Kind = SourceRecord['kind'];
interface Loaded {
  items: GcpResource[];
  error?: SourceError;
}
const SHOW = 40;

export interface SourcePickerProps {
  deps: OptionsDeps;
  existing: ReadonlySet<string>;
  onAdd: (kind: Kind, r: GcpResource) => void;
}

/** Searchable picker of the organizations and projects the signed-in account can see. */
export function SourcePicker({ deps, existing, onAdd }: SourcePickerProps) {
  const [kind, setKind] = useState<Kind>('project');
  const [q, setQ] = useState('');
  const [data, setData] = useState<Record<Kind, Loaded> | null>(null);

  useEffect(() => {
    let live = true;
    const settle = (p: Promise<GcpResource[]>): Promise<Loaded> =>
      p.then(
        (items) => ({ items }),
        (e: unknown) => ({ items: [], error: describeError(e) }),
      );
    void Promise.all([settle(deps.listProjects()), settle(deps.listOrganizations())]).then(
      ([project, organization]) => {
        if (live) setData({ project, organization });
      },
    );
    return () => {
      live = false;
    };
  }, [deps]);

  const current = data?.[kind];
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all = current?.items ?? [];
    return needle ? all.filter((r) => `${r.displayName} ${r.id}`.toLowerCase().includes(needle)) : all;
  }, [current, q]);

  const noun = kind === 'project' ? 'project' : 'organization';
  return (
    <div className={styles.root}>
      <SegmentedButton
        label="Source type"
        value={kind}
        onChange={(id) => setKind(id as Kind)}
        segments={[
          { id: 'project', label: data ? `Projects · ${data.project.items.length}` : 'Projects' },
          {
            id: 'organization',
            label: data ? `Organizations · ${data.organization.items.length}` : 'Organizations',
          },
        ]}
      />
      <SearchBar
        label={`Filter ${noun}s`}
        placeholder={`Filter ${noun}s by name or ID`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={styles.search}
      />
      {!data && <SkeletonList rows={3} label="Loading projects and organizations" />}
      {current?.error && (
        <p className={styles.note} role="alert">
          <Icon name="error" size={18} />
          <span>{current.error.message}</span>
        </p>
      )}
      {data && !current?.error && matches.length === 0 && (
        <p className={styles.empty}>
          {q ? `No ${noun}s match “${q}”.` : `Your account can't see any ${noun}s yet.`}
        </p>
      )}
      {matches.length > 0 && (
        <List label={`Available ${noun}s`}>
          {matches.slice(0, SHOW).map((r, i) => {
            const added = existing.has(parentOf(kind, r));
            return (
              <ListItem
                key={r.id}
                index={i}
                leadingIcon={kind === 'project' ? 'target' : 'badge'}
                headline={r.displayName}
                supporting={<span className={styles.mono}>{r.id}</span>}
                action={
                  added ? (
                    <span className={styles.added}>
                      <Icon name="check" size={18} /> Added
                    </span>
                  ) : (
                    <Button
                      variant="tonal"
                      onClick={() => onAdd(kind, r)}
                      aria-label={`Add ${r.displayName}`}
                    >
                      Add
                    </Button>
                  )
                }
              />
            );
          })}
        </List>
      )}
      {matches.length > SHOW && (
        <p className={styles.empty}>
          Showing {SHOW} of {plural(matches.length, noun)}. Type to narrow the list.
        </p>
      )}
    </div>
  );
}
