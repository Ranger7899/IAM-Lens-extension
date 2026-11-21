import { PermissionToken, Icon, type Risk } from '@/ui/components';
import type { ParsedToken } from './parse';
import styles from './minimal.module.css';

export interface MinimalInputProps {
  value: string;
  onChange: (v: string) => void;
  tokens: ParsedToken[];
  /** Tokens that are well-formed but absent from the permission table. */
  unknown: ReadonlySet<string>;
  riskOf: (perm: string) => Risk | undefined;
}

/** Multi-line paste box with live-parsed chips below it. Bad tokens get an error state. */
export function MinimalInput({ value, onChange, tokens, unknown, riskOf }: MinimalInputProps) {
  const bad = tokens.filter((t) => !t.valid || unknown.has(t.text)).length;
  return (
    <section className={styles.input} aria-label="Permissions to cover">
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Permissions</span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={'storage.objects.get\nstorage.objects.list, pubsub.topics.publish'}
          aria-label="Permissions, separated by new lines, commas or spaces"
          className={styles.textarea}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
      {tokens.length > 0 && (
        <>
          <ul className={styles.chips} aria-label="Parsed permissions">
            {tokens.map((t) => {
              const isBad = !t.valid || unknown.has(t.text);
              return (
                <li key={t.text}>
                  {isBad ? (
                    <span
                      className={styles.badToken}
                      title={t.valid ? 'Not a known permission' : 'Not a valid permission name'}
                      aria-label={`${t.text}, ${t.valid ? 'unknown permission' : 'invalid permission name'}`}
                    >
                      <Icon name="error" size={14} filled />
                      {t.text}
                    </span>
                  ) : (
                    <PermissionToken permission={t.text} risk={riskOf(t.text)} static />
                  )}
                </li>
              );
            })}
          </ul>
          <p className={styles.count} aria-live="polite">
            {tokens.length} {tokens.length === 1 ? 'permission' : 'permissions'}
            {bad > 0 && <span className={styles.countBad}> · {bad} not recognised</span>}
          </p>
        </>
      )}
    </section>
  );
}
