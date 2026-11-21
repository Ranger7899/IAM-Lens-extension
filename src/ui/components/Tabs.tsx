import { useRef, type KeyboardEvent } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
}
export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

/** Console tabs with roving tabindex and arrow-key navigation. */
export function Tabs({ tabs, value, onChange, label }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    const target =
      e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + move + tabs.length) % tabs.length;
    if (!move && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    onChange(tabs[target].id);
    refs.current[target]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={styles.root}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          id={`tab-${t.id}`}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          className={styles.tab}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
