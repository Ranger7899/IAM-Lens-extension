import styles from './Monogram.module.css';

/** Two-letter service monogram tile derived from a role ID ("roles/storage.admin" -> "st"). */
export function Monogram({ id, size = 40 }: { id: string; size?: number }) {
  const service = id.replace(/^roles\//, '').split('.')[0] ?? '';
  return (
    <span className={styles.root} style={{ width: size, height: size }} aria-hidden="true">
      {service.slice(0, 2).toLowerCase() || 'ro'}
    </span>
  );
}
