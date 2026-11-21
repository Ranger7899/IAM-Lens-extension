import { Card } from '@/ui/components';

/** Stub. The real screen lands in IAM-9. */
export function SearchScreen({ query }: { query: string }) {
  return (
    <Card variant="filled">
      <h2 style={{ margin: 0, font: 'var(--md-sys-typescale-title-medium)' }}>Search</h2>
      <p style={{ margin: '4px 0 0', color: 'var(--md-sys-color-on-surface-variant)' }}>
        Coming in IAM-9. Query: {query || '(none)'}
      </p>
    </Card>
  );
}
