import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EXACT,
  GENERIC,
  IAM_ICON,
  resolveServiceIcon,
  serviceOf,
} from '../../../scripts/service-icon-map.ts';
import { GENERIC_ICON, SERVICE_ICONS } from '../serviceIcons.generated';
import { ServiceIcon, serviceIconPath, serviceOfId } from './ServiceIcon';

const snap = JSON.parse(readFileSync('data/roles.snapshot.json', 'utf8')) as {
  permissions: string[];
  roles: { name: string }[];
};
const services = new Set([...snap.permissions.map(serviceOf), ...snap.roles.map((r) => serviceOf(r.name))]);

describe('service icon map', () => {
  it('covers every service in the snapshot, with a generated path and no undefined', () => {
    expect(services.size).toBeGreaterThan(300);
    for (const s of services) {
      expect(resolveServiceIcon(s).file, s).toBeTruthy();
      expect(SERVICE_ICONS[s], s).toMatch(/^\/service-icons\/.+\.svg$/);
    }
  });

  it('maps the known services exactly', () => {
    const file = (s: string) => resolveServiceIcon(s).file;
    expect(file('storage')).toBe('core/Cloud_Storage-512-color.svg');
    expect(file('bigquery')).toBe('core/BigQuery-512-color.svg');
    expect(file('pubsub')).toBe('legacy/pubsub.svg');
    expect(file('iam')).toBe(IAM_ICON);
    expect(file('cloudkms')).toBe('legacy/key_management_service.svg');
    expect(file('run')).toBe('core/CloudRun-512-color-rgb.svg');
    expect(file('compute')).toBe('core/ComputeEngine-512-color-rgb.svg');
    expect(file('container')).toBe('core/GKE-512-color.svg');
    expect(file('secretmanager')).toBe('legacy/secret_manager.svg');
    expect(file('aiplatform')).toBe('core/VertexAI-512-color.svg');
    for (const s of ['storage', 'bigquery', 'pubsub', 'iam', 'cloudkms', 'run', 'compute', 'container']) {
      expect(resolveServiceIcon(s).tier).toBe('exact');
    }
  });

  it('uses the IAM icon for basic roles and falls back to generic for unknown services', () => {
    for (const s of ['viewer', 'editor', 'owner']) expect(file(s)).toBe(IAM_ICON);
    expect(resolveServiceIcon('nope-not-a-service').file).toBe(GENERIC);
    expect(Object.keys(EXACT).length).toBeGreaterThan(150);
  });
});

const file = (s: string) => resolveServiceIcon(s).file;

describe('ServiceIcon', () => {
  it('derives the service from role and permission IDs', () => {
    expect(serviceOfId('roles/storage.objectViewer')).toBe('storage');
    expect(serviceOfId('storage.objects.get')).toBe('storage');
    expect(serviceOfId('roles/viewer')).toBe('viewer');
    expect(serviceOfId('projects/p/roles/custom')).toBeUndefined();
    expect(serviceIconPath(undefined)).toBe(SERVICE_ICONS.iam);
    expect(serviceIconPath('zzz')).toBe(GENERIC_ICON);
  });

  it('renders a decorative sized <img>', () => {
    const html = renderToStaticMarkup(<ServiceIcon id="roles/storage.admin" size={32} />);
    expect(html).toContain('alt=""');
    expect(html).toContain('width="32"');
    expect(html).toContain('service-icons/core--cloud_storage-512-color.svg');
  });
});
