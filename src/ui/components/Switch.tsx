import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** One-line description under the label; wired as the accessible description. */
  description?: string;
  id?: string;
}

/** Console on/off switch (role="switch"); the whole row is the click target. */
export function Switch({ checked, onChange, label, description, id }: SwitchProps) {
  const descId = description && id ? `${id}-desc` : undefined;
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-describedby={descId}
      className={styles.root}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && (
          <span id={descId} className={styles.desc}>
            {description}
          </span>
        )}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
