import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { permissionDetail, riskOf, roleById } from '../demo/fixtures';
import { PermissionDetail } from './PermissionDetail';
import { RoleDetail } from './RoleDetail';

const noop = () => {};

describe('screens', () => {
  it('PermissionDetail puts the least-privilege badge on the smallest role', () => {
    const html = renderToStaticMarkup(
      <PermissionDetail
        permission={permissionDetail('storage.objects.get')}
        onBack={noop}
        onOpenRole={noop}
      />,
    );
    const firstRole = html.indexOf('Storage Legacy Object Reader');
    const badge = html.indexOf('Least privilege');
    expect(firstRole).toBeGreaterThan(-1);
    expect(badge).toBeGreaterThan(firstRole);
    expect(html.match(/Least privilege/g)).toHaveLength(1);
  });

  it('RoleDetail groups permissions by service', () => {
    const html = renderToStaticMarkup(
      <RoleDetail role={roleById('roles/storage.admin')!} onBack={noop} onOpenPermission={noop} />,
    );
    expect(html).toContain('resourcemanager');
    expect(html).toContain('aria-label="18 read, 14 write, 7 admin"');
  });

  it('demo classifier maps verbs to risk', () => {
    expect(riskOf('storage.objects.get')).toBe('read');
    expect(riskOf('storage.objects.create')).toBe('write');
    expect(riskOf('iam.serviceAccounts.actAs')).toBe('admin');
  });
});
