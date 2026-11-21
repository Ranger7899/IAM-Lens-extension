import { useEffect } from 'react';
import styles from './Snackbar.module.css';

export interface SnackbarProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

/** Announced politely to screen readers; auto-dismisses. */
export function Snackbar({ message, onClose, duration = 4000 }: SnackbarProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);
  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {message && <div className={styles.root}>{message}</div>}
    </div>
  );
}
