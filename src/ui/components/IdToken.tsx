import { Icon } from './Icon';
import { useCopy } from './PermissionToken';
import styles from './IdToken.module.css';

export interface IdTokenProps {
  /** Role ID such as "roles/storage.admin" */
  value: string;
  onCopied?: (value: string) => void;
}

/** Monospace role-ID pill (click to copy). `roles/` is muted, the rest is emphasised. */
export function IdToken({ value, onCopied }: IdTokenProps) {
  const { copied, copy } = useCopy();
  const slash = value.indexOf('/');
  const prefix = slash >= 0 ? value.slice(0, slash + 1) : '';
  const rest = value.slice(prefix.length);
  return (
    <button
      type="button"
      className={styles.root}
      aria-label={`Copy role ID ${value}`}
      onClick={async () => {
        if (await copy(value)) onCopied?.(value);
      }}
    >
      <span className={styles.prefix}>{prefix}</span>
      <span className={styles.rest}>{rest}</span>
      <Icon name={copied ? 'check' : 'content_copy'} size={14} className={styles.icon} />
      <span className="sr-only" role="status">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
