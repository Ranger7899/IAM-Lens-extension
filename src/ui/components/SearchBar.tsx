import { useEffect, useRef, type InputHTMLAttributes, type RefObject } from 'react';
import { Icon } from './Icon';
import styles from './SearchBar.module.css';

/** Focuses `ref` when "/" is pressed outside an editable element. */
export function useSlashFocus(ref: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref]);
}

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/** M3 search bar: full pill at rest, morphs to a 16px-radius sheet on focus. */
export function SearchBar({ label = 'Search roles and permissions', className, ...rest }: SearchBarProps) {
  const ref = useRef<HTMLInputElement>(null);
  useSlashFocus(ref);
  return (
    <div className={`${styles.root} ${className ?? ''}`} role="search">
      <Icon name="search" className={styles.icon} />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder="Search permissions and roles"
        aria-keyshortcuts="/"
        className={styles.input}
        {...rest}
      />
      <kbd className={styles.kbd} aria-hidden="true">
        /
      </kbd>
    </div>
  );
}
