import { Icon, type IconName } from './Icon';
import styles from './SegmentedButton.module.css';

export interface Segment {
  id: string;
  label: string;
  icon?: IconName;
}
export interface SegmentedButtonProps {
  segments: Segment[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  /** Show icons on unselected segments too (needs roomy widths) */
  icons?: boolean;
}

/** Single-select console outlined-group button (radio group semantics, arrow-key navigation). */
export function SegmentedButton({ segments, value, onChange, label, icons = false }: SegmentedButtonProps) {
  return (
    <div role="radiogroup" aria-label={label} className={styles.root}>
      {segments.map((s) => {
        const selected = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`${styles.seg} ${selected ? styles.selected : ''}`}
            onClick={() => onChange(s.id)}
            onKeyDown={(e) => {
              const i = segments.findIndex((x) => x.id === value);
              const d =
                e.key === 'ArrowRight' || e.key === 'ArrowDown'
                  ? 1
                  : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                    ? -1
                    : 0;
              if (!d) return;
              e.preventDefault();
              const next = segments[(i + d + segments.length) % segments.length];
              onChange(next.id);
              (
                e.currentTarget.parentElement?.querySelector(`[data-id="${next.id}"]`) as HTMLElement | null
              )?.focus();
            }}
            data-id={s.id}
          >
            {selected ? <Icon name="check" size={18} /> : icons && s.icon && <Icon name={s.icon} size={18} />}
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}
