import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PermissionToken } from './PermissionToken';
import { PrivilegeBar } from './PrivilegeBar';

describe('components', () => {
  it('PermissionToken splits permission segments', () => {
    const html = renderToStaticMarkup(<PermissionToken permission="storage.objects.get" risk="read" />);
    expect(html).toContain('storage');
    expect(html).toContain('.objects');
    expect(html).toContain('.get');
  });

  it('PrivilegeBar exposes counts in its aria-label', () => {
    const html = renderToStaticMarkup(<PrivilegeBar read={142} write={30} admin={4} />);
    expect(html).toContain('aria-label="142 read, 30 write, 4 admin"');
  });
});
