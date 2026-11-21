import { Button } from './Button';
import { Card } from './Card';
import { Icon } from './Icon';
import styles from './ErrorCard.module.css';

export interface ErrorCardProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

/** M3 error card with an optional retry action. */
export function ErrorCard({ title, detail, onRetry }: ErrorCardProps) {
  return (
    <Card variant="filled" className={styles.root} role="alert">
      <span className={styles.tile}>
        <Icon name="error" size={22} />
      </span>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {detail && <p className={styles.detail}>{detail}</p>}
      </div>
      {onRetry && (
        <div className={styles.actions}>
          <Button variant="tonal" icon="refresh" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </Card>
  );
}
