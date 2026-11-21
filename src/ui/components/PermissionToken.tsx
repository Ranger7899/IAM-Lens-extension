import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './PermissionToken.module.css';

import type { Risk } from '../types';
export type { Risk };

/** Copies text to the clipboard; `copied` flips true briefly for feedback. */
export function useCopy(resetMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return false;
      }
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );
  return { copied, copy };
}

export interface PermissionTokenProps {
  /** Full permission, e.g. "storage.objects.get" */
  permission: string;
  risk?: Risk;
  /** Called after a successful copy (e.g. to show a snackbar) */
  onCopied?: (permission: string) => void;
  /** Render as a non-interactive span (for use inside another control) */
  static?: boolean;
}

/** Monospace pill: service (primary) . resource (muted) . verb (risk-coloured). Click to copy. */
export function PermissionToken({ permission, risk, onCopied, static: isStatic }: PermissionTokenProps) {
  const { copied, copy } = useCopy();
  const parts = permission.split('.');
  const service = parts[0];
  const verb = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const resource = parts.slice(1, -1).join('.');
  const segments = (
    <>
      <span className={styles.service}>{service}</span>
      {resource && <span className={styles.resource}>.{resource}</span>}
      {verb && <span className={`${styles.verb} ${risk ? styles[risk] : ''}`}>.{verb}</span>}
    </>
  );
  if (isStatic) return <span className={`${styles.root} ${styles.static}`}>{segments}</span>;
  return (
    <button
      type="button"
      className={styles.root}
      aria-label={`Copy permission ${permission}`}
      onClick={async () => {
        if (await copy(permission)) onCopied?.(permission);
      }}
    >
      {segments}
      <span className="sr-only" role="status">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
