import { useMemo } from 'react';
import { useNavigate } from '../navigation';
import { EmptyState } from '@/ui/components';
import { useIam } from '@/ui/data';
import { PermissionDetailView } from './permission/PermissionDetailView';
import { PermissionPicker } from './permission/PermissionPicker';
import { resolvePermission } from './permission/resolve';

/** `permission/:name`: roles granting the permission, smallest first; partial input shows a picker. */
export function PermissionScreen({ name }: { name: string }) {
  const { go } = useNavigate();
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
          onOpenRole={(id) => go({ name: 'role', id })}
        />
      );
    case 'picker':
      return (
        <PermissionPicker
          index={index}
          input={name}
          matches={resolved.matches}
          truncated={resolved.truncated}
          onPick={(p) => go({ name: 'permission', id: p })}
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
