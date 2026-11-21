import { GENERIC_ICON, IAM_ICON, SERVICE_ICONS } from '../serviceIcons.generated';

export type ServiceIconSize = 20 | 24 | 32;

/**
 * Service prefix of a permission ("storage.objects.get" -> "storage") or a predefined role
 * ("roles/storage.admin" -> "storage"). Custom roles ("projects/p/roles/x") have no service: undefined.
 */
export function serviceOfId(id: string): string | undefined {
  if (id.includes('/') && !id.startsWith('roles/')) return undefined;
  return id.replace(/^roles\//, '').split('.')[0] || undefined;
}

/** Extension-relative asset path of the official GCP icon for a service prefix (generic if unknown). */
export function serviceIconPath(service: string | undefined): string {
  if (!service) return IAM_ICON;
  return SERVICE_ICONS[service] ?? GENERIC_ICON;
}

function assetUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path;
}

export interface ServiceIconProps {
  /** A role ID ("roles/storage.admin", "roles/viewer", a custom role) or a permission ("storage.objects.get"). */
  id?: string;
  /** Explicit service prefix; wins over `id`. */
  service?: string;
  size?: ServiceIconSize;
}

/**
 * Official Google Cloud product icon for a service. Decorative (the service name is carried by the row text).
 * Rendered as <img>, not inline SVG: these SVGs reuse ids such as #mask, which would collide if inlined.
 */
export function ServiceIcon({ id, service, size = 24 }: ServiceIconProps) {
  const svc = service ?? (id ? serviceOfId(id) : undefined);
  return (
    <img
      src={assetUrl(serviceIconPath(svc))}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ flex: 'none', display: 'block' }}
    />
  );
}
