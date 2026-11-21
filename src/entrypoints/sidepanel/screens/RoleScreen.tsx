import { Card } from '@/ui/components';

/** Stub. The real screen lands in IAM-10. */
export function RoleScreen({ name }: { name: string }) {
  return (
    <Card variant="filled">
      <h2 style={{ margin: 0, font: 'var(--md-sys-typescale-title-medium)' }}>Role</h2>
      <p style={{ margin: '4px 0 0', color: 'var(--md-sys-color-on-surface-variant)' }}>
        Coming in IAM-10. Route param: {name}
      </p>
    </Card>
  );
}
