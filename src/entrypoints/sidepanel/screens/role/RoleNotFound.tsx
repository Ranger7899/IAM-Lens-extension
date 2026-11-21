import { Button, Card, Icon } from '@/ui/components';
import { useNavigate } from '../../navigation';
import { suggestQuery } from './roleLinks';
import styles from './RoleNotFound.module.css';

/** Unknown role: say so plainly and offer a search seeded from the name. */
export function RoleNotFound({ name }: { name: string }) {
  const { go } = useNavigate();
  const q = suggestQuery(name);
  return (
    <Card variant="filled" className={styles.root} role="alert">
      <span className={styles.glyph}>
        <Icon name="search" size={28} />
      </span>
      <h2 className={styles.title}>Role not found</h2>
      <p className={styles.body}>
        No predefined role is called <code className={styles.code}>{name}</code>. It may have been renamed or
        removed, or it could be a custom role.
      </p>
      <div className={styles.actions}>
        {q && (
          <Button variant="tonal" icon="search" onClick={() => go({ name: 'search', query: q })}>
            Search for “{q}”
          </Button>
        )}
        <Button variant="text" onClick={() => go({ name: 'search', query: '' })}>
          Browse all
        </Button>
      </div>
    </Card>
  );
}
