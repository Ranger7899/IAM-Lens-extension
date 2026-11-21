import { useMemo } from 'react';
import { EmptyState } from '@/ui/components';
import { useIam } from '@/ui/data';
import { PermissionDetailView } from './permission/PermissionDetailView';
import { PermissionPicker } from './permission/PermissionPicker';
import { resolvePermission } from './permission/resolve';

// Hash navigation, same format as the router's routeHref (not imported: router imports this file).
const go = (path: 'role' | 'permission', id: string) => {
  location.hash = `#/${path}/${encodeURIComponent(id)}`;
};

/** `permission/:name`: roles granting the permission, smallest first; partial input shows a picker. */
export function PermissionScreen({ name }: { name: string }) {
  const { index } = useIam();
  const resolved = useMemo(() => (index ? resolvePermission(index, name) : undefined), [index, name]);
  if (!index || !resolved) return null;
  switch (resolved.kind) {
    case 'exact':
      return (
        <PermissionDetailView
          key={resolved.permission}
          index={index}
          permIdx={resolved.index}
          onOpenRole={(id) => go('role', id)}
        />
      );
    case 'picker':
      return (
        <PermissionPicker
          index={index}
          input={name}
          matches={resolved.matches}
          truncated={resolved.truncated}
          onPick={(p) => go('permission', p)}
        />
      );
    default:
      return (
        <EmptyState
          title="No such permission"
          hint={`Nothing matches "${name}". Permissions look like service.resource.verb.`}
          examples={[]}
        />
      );
  }
}
