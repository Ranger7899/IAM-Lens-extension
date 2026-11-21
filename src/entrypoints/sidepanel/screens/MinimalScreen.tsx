import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Button, Chip, Icon, PermissionToken, Snackbar } from '@/ui/components';
import { useIam } from '@/ui/data';
import { minimalRoles, type IamIndex } from '@/core';
import { parseRoute } from '../routes';
import { useNavigate } from '../navigation';
import { CoverageMatrix } from './minimal/CoverageMatrix';
import { MinimalInput } from './minimal/MinimalInput';
import { RoleResultCard } from './minimal/RoleResultCard';
import { EXAMPLE_PERMISSIONS, gcloudBinding, parsePermissionText } from './minimal/parse';
import styles from './minimal/minimal.module.css';

export interface MinimalScreenProps {
  /** Permissions to prefill (from `route.perms`); falls back to the current hash. */
  perms?: string[];
}

/** `minimal`: paste permissions, get the smallest set of roles that grants all of them. */
export function MinimalScreen({ perms }: MinimalScreenProps) {
  const iam = useIam();
  if (iam.status !== 'ready') return null; // IamGate normally guards this
  return <MinimalView index={iam.index} perms={perms} />;
}

function initialText(perms?: string[]): string {
  if (perms?.length) return perms.join('\n');
  const r = parseRoute(location.hash);
  return r.name === 'minimal' && r.perms ? r.perms.join('\n') : '';
}

function MinimalView({ index, perms }: { index: IamIndex; perms?: string[] }) {
  const { go } = useNavigate();
  const [text, setText] = useState(() => initialText(perms));
  const [message, setMessage] = useState<string | null>(null);
  const closeSnack = useCallback(() => setMessage(null), []);

  const deferred = useDeferredValue(text);
  const tokens = useMemo(() => parsePermissionText(deferred), [deferred]);
  const wellFormed = useMemo(() => tokens.filter((t) => t.valid).map((t) => t.text), [tokens]);
  const result = useMemo(() => minimalRoles(index, wellFormed), [index, wellFormed]);
  const unknown = useMemo(() => new Set(result.unknown), [result]);
  const riskOf = useCallback(
    (p: string) => {
      const i = index.permissionIndex(p);
      return i === undefined ? undefined : index.classOf(i);
    },
    [index],
  );

  const covered = Object.keys(result.coverage).length - result.uncoverable.length;
  const invalid = tokens.filter((t) => !t.valid);
  const hasResults = result.roles.length > 0;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied`);
    } catch {
      setMessage(`Couldn’t copy ${label.toLowerCase()}`);
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h2>Find minimal roles</h2>
        <p>
          Paste the permissions a workload needs. We pick the fewest, smallest roles that grant all of them.
        </p>
      </header>

      <MinimalInput value={text} onChange={setText} tokens={tokens} unknown={unknown} riskOf={riskOf} />

      {tokens.length === 0 ? (
        <section className={styles.empty} aria-label="Example">
          <p className={styles.eyebrow}>Try an example</p>
          <ul className={styles.chips}>
            {EXAMPLE_PERMISSIONS.map((p) => (
              <li key={p}>
                <PermissionToken permission={p} risk={riskOf(p)} static />
              </li>
            ))}
          </ul>
          <Button variant="tonal" icon="target" onClick={() => setText(EXAMPLE_PERMISSIONS.join('\n'))}>
            Find roles for these
          </Button>
        </section>
      ) : (
        <div className={styles.toolbar}>
          <Button variant="text" icon="refresh" onClick={() => setText('')}>
            Clear
          </Button>
        </div>
      )}

      {hasResults && (
        <>
          <section className={styles.summary} aria-live="polite" aria-label="Result summary">
            <div className={styles.big}>
              <strong>{result.roles.length}</strong>
              <span>{result.roles.length === 1 ? 'role' : 'roles'}</span>
            </div>
            <p>
              cover {covered} of {covered + result.uncoverable.length}{' '}
              {covered + result.uncoverable.length === 1 ? 'permission' : 'permissions'}
              {result.roles.some((r) => r.discouraged) && ', one of them discouraged'}
            </p>
            <div className={styles.actions}>
              <Chip
                icon="content_copy"
                onClick={() => void copy(result.roles.map((r) => r.role.name).join('\n'), 'Role IDs')}
              >
                Copy role IDs
              </Chip>
              <Chip
                onClick={() =>
                  void copy(
                    result.roles.map((r) => gcloudBinding(r.role.name)).join('\n\n'),
                    'gcloud commands',
                  )
                }
              >
                gcloud commands
              </Chip>
            </div>
          </section>

          <div className={styles.list}>
            {result.roles.map((c, i) => (
              <RoleResultCard
                key={c.role.name}
                n={i + 1}
                order={i}
                chosen={c}
                profile={index.profile(c.role)}
                riskOf={riskOf}
                onCopyId={() => setMessage('Role ID copied')}
                onCopyGcloud={() => void copy(gcloudBinding(c.role.name), 'gcloud binding')}
              />
            ))}
          </div>

          <CoverageMatrix result={result} riskOf={riskOf} />
        </>
      )}

      {result.uncoverable.length > 0 && (
        <ProblemSection
          title="Uncoverable"
          icon="shield"
          note="Known permissions that no role grants (for example internal or not-yet-released ones)."
          items={result.uncoverable}
        />
      )}
      {(result.unknown.length > 0 || invalid.length > 0) && (
        <ProblemSection
          title="Unknown"
          icon="error"
          note="Not in the permissions table. Check the spelling, or search for the service."
          items={[...result.unknown, ...invalid.map((t) => t.text)]}
          action={
            <Button
              variant="text"
              icon="search"
              onClick={() =>
                go({ name: 'search', query: [...result.unknown, ...invalid.map((t) => t.text)][0] })
              }
            >
              Search for it
            </Button>
          }
        />
      )}
      <Snackbar message={message} onClose={closeSnack} />
    </div>
  );
}

function ProblemSection({
  title,
  icon,
  note,
  items,
  action,
}: {
  title: string;
  icon: 'shield' | 'error';
  note: string;
  items: string[];
  action?: React.ReactNode;
}) {
  return (
    <section className={styles.problem} aria-label={title}>
      <h3>
        <Icon name={icon} size={18} filled />
        {title} · {items.length}
      </h3>
      <p>{note}</p>
      <ul className={styles.chips}>
        {items.map((p) => (
          <li key={p}>
            <span className={styles.badToken}>{p}</span>
          </li>
        ))}
      </ul>
      {action}
    </section>
  );
}
