import { Card } from '@/ui/components';

/** Stub. The real screen lands in IAM-14. */
export function WhatsNewScreen() {
  return (
    <Card variant="filled">
      <h2 style={{ margin: 0, font: 'var(--md-sys-typescale-title-medium)' }}>What's new</h2>
      <p style={{ margin: '4px 0 0', color: 'var(--md-sys-color-on-surface-variant)' }}>Coming in IAM-14.</p>
    </Card>
  );
}
