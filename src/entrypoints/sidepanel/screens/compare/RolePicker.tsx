import { useId, useMemo, useRef, useState } from 'react';
import { Icon, IconButton } from '@/ui/components';
import type { IamIndex } from '@/core';
import styles from './compare.module.css';

export interface RolePickerProps {
  index: IamIndex;
  /** "A" or "B": shown as the leading badge. */
  side: 'A' | 'B';
  /** Currently selected role id (may be unknown to the index). */
  value?: string;
  onPick: (roleName: string | undefined) => void;
}

/** Role autocomplete in the shape of the M3 search bar: a pill that morphs into a sheet while its results are open. */
export function RolePicker({ index, side, value, onPick }: RolePickerProps) {
  const listId = useId();
  const [text, setText] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-sync the text when the selected role changes from outside (swap, deep link).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value ?? '');
  }

  const known = value ? index.findRole(value) : undefined;
  const unknown = !!value && !known;
  const query = text.trim();
  const hits = useMemo(
    () => (open && query && query !== value ? index.searchRoles(query, 6) : []),
    [index, open, query, value],
  );
  const expanded = open && hits.length > 0;

  function choose(name: string) {
    setOpen(false);
    setText(name);
    onPick(name);
  }

  return (
    <div
      className={`${styles.picker} ${expanded ? styles.pickerOpen : ''} ${unknown ? styles.pickerError : ''}`}
    >
      <div className={styles.pickerField}>
        <span className={`${styles.side} ${side === 'A' ? styles.sideA : styles.sideB}`} aria-hidden="true">
          {side}
        </span>
        <input
          ref={inputRef}
          role="combobox"
          aria-label={`Role ${side}`}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          aria-invalid={unknown || undefined}
          className={styles.pickerInput}
          value={text}
          placeholder={`Search role ${side}`}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && hits.length) {
              e.preventDefault();
              setActive((i) => (i + 1) % hits.length);
            } else if (e.key === 'ArrowUp' && hits.length) {
              e.preventDefault();
              setActive((i) => (i - 1 + hits.length) % hits.length);
            } else if (e.key === 'Enter' && expanded) {
              e.preventDefault();
              choose(hits[active].role.name);
            } else if (e.key === 'Escape' && open) {
              e.stopPropagation();
              setOpen(false);
            }
          }}
        />
        {(value || text) && (
          <IconButton
            icon="close"
            label={`Clear role ${side}`}
            size="sm"
            // keep focus in the input; mousedown would blur it first
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText('');
              onPick(undefined);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>
      {unknown && (
        <p className={styles.pickerNote} role="alert">
          <Icon name="error" size={14} filled /> No role called {value}
        </p>
      )}
      {expanded && (
        <ul id={listId} role="listbox" aria-label={`Roles matching ${query}`} className={styles.options}>
          {hits.map(({ role }, i) => (
            <li
              key={role.name}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${styles.option} ${i === active ? styles.optionActive : ''}`}
              style={{ '--i': i } as React.CSSProperties}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(role.name)}
            >
              <span className={styles.optionTitle}>{role.title || role.name}</span>
              <span className={styles.optionId}>{role.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
