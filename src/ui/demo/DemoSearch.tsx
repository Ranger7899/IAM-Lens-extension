import { EmptyState } from '../components';
import { PermissionDetail, RoleDetail, SearchResults } from '../screens';
import { EXAMPLE_QUERIES, permissionDetail, roleById, search } from './fixtures';
import { useDemoRouter } from './router';

/** Routed body of the Search mode: results list, role detail, permission detail. Uses fixture data. */
export function DemoSearch({ onCopied }: { onCopied: (text: string) => void }) {
  const { route, query, setQuery, go, back } = useDemoRouter();
  if (route.name === 'role') {
    const role = roleById(route.id);
    if (role) {
      return (
        <RoleDetail
          role={role}
          onBack={back}
          onOpenPermission={(id) => go({ name: 'permission', id })}
          onCopied={onCopied}
        />
      );
    }
  }
  if (route.name === 'permission') {
    return (
      <PermissionDetail
        permission={permissionDetail(route.id)}
        onBack={back}
        onOpenRole={(id) => go({ name: 'role', id })}
        onCopy={onCopied}
      />
    );
  }
  const { roles, permissions } = search(query);
  if (!query.trim()) {
    return (
      <EmptyState
        title="Look up any permission or role"
        hint="Find which roles grant a permission, or which permissions a role has."
        examples={EXAMPLE_QUERIES}
        onPick={setQuery}
      />
    );
  }
  return (
    <SearchResults
      roles={roles}
      permissions={permissions}
      onOpenRole={(id) => go({ name: 'role', id })}
      onOpenPermission={(id) => go({ name: 'permission', id })}
      onCopied={onCopied}
    />
  );
}
