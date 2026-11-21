import { IconButton, List, ListItem, PermissionToken } from '../components';
import type { PermissionEntry, RoleSummary } from '../types';
import { RoleRow, SectionHeader } from './parts';
import styles from './SearchResults.module.css';

export interface SearchResultsProps {
  roles: RoleSummary[];
  permissions: PermissionEntry[];
  onOpenRole: (id: string) => void;
  onOpenPermission: (id: string) => void;
  onCopied?: (text: string) => void;
  /** Limit rows per section (the popup shows only the top few) */
  limit?: number;
}

function CopyButton({ text, onCopied }: { text: string; onCopied?: (t: string) => void }) {
  return (
    <IconButton
      icon="content_copy"
      size="sm"
      label={`Copy ${text}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).catch(() => {});
        onCopied?.(text);
      }}
    />
  );
}

export function SearchResults({
  roles,
  permissions,
  onOpenRole,
  onOpenPermission,
  onCopied,
  limit,
}: SearchResultsProps) {
  const r = limit ? roles.slice(0, limit) : roles;
  const p = limit ? permissions.slice(0, limit) : permissions;
  if (!r.length && !p.length) {
    return <p className={styles.none}>No roles or permissions match. Try a service name like “storage”.</p>;
  }
  return (
    <div className={styles.root}>
      {r.length > 0 && (
        <section>
          <SectionHeader title="Roles" count={roles.length} />
          <List label="Roles">
            {r.map((role, i) => (
              <RoleRow key={role.id} role={role} index={i} onOpen={onOpenRole} />
            ))}
          </List>
        </section>
      )}
      {p.length > 0 && (
        <section>
          <SectionHeader title="Permissions" count={permissions.length} />
          <List label="Permissions">
            {p.map((perm, i) => (
              <ListItem
                key={perm.id}
                index={i + r.length}
                onClick={() => onOpenPermission(perm.id)}
                headline={
                  <span className={styles.tokenWrap}>
                    <PermissionToken permission={perm.id} risk={perm.risk} static />
                  </span>
                }
                action={<CopyButton text={perm.id} onCopied={onCopied} />}
              />
            ))}
          </List>
        </section>
      )}
    </div>
  );
}
