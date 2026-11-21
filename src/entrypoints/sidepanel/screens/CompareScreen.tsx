import { useCallback, useMemo, useState } from 'react';
import { Card, EmptyState, IconButton, PrivilegeBar, Snackbar, SourceBadge } from '@/ui/components';
import { useIam } from '@/ui/data';
import { diffRoles, type IamIndex, type RoleRecord } from '@/core';
import { useNavigate } from '../navigation';
import { DiffSection } from './compare/DiffSection';
import { RolePicker } from './compare/RolePicker';
import { useCompareRoute } from './compare/useCompareRoute';
import styles from './compare/compare.module.css';

const fmt = (n: number) => n.toLocaleString('en-US');

/** `compare?a=&b=`: pick two roles and see what is only in A, only in B, and shared. */
export function CompareScreen() {
  const iam = useIam();
  const { a, b } = useCompareRoute();
  if (iam.status !== 'ready') return null; // IamGate normally guards this
  return <CompareView index={iam.index} a={a} b={b} />;
}

function CompareView({ index, a, b }: { index: IamIndex; a?: string; b?: string }) {
  const { go } = useNavigate();
  const roleA = a ? index.findRole(a) : undefined;
  const roleB = b ? index.findRole(b) : undefined;
  const [message, setMessage] = useState<string | null>(null);
  const closeSnack = useCallback(() => setMessage(null), []);

  const diff = useMemo(
    () => (roleA && roleB ? diffRoles(index, roleA.name, roleB.name) : undefined),
    [index, roleA, roleB],
  );

  const set = (next: { a?: string; b?: string }) => go({ name: 'compare', ...next }, { replace: true });

  async function copy(list: readonly string[], label: string) {
    try {
      await navigator.clipboard.writeText(list.join('\n'));
      setMessage(`${fmt(list.length)} ${label} permissions copied`);
    } catch {
      setMessage('Couldn’t copy to the clipboard');
    }
  }

  const nameOf = (r: RoleRecord) => r.title || r.name;

  return (
    <article className={styles.root} aria-label="Compare roles">
      <div className={styles.pickers}>
        <RolePicker index={index} side="A" value={a} onPick={(v) => set({ a: v, b })} />
        <div className={styles.swap}>
          <IconButton
            icon="compare_arrows"
            label="Swap roles A and B"
            variant="tonal"
            size="sm"
            className={styles.swapIcon}
            disabled={!a && !b}
            onClick={() => set({ a: b, b: a })}
          />
        </div>
        <RolePicker index={index} side="B" value={b} onPick={(v) => set({ a, b: v })} />
      </div>

      {roleA && roleB && (
        <div className={styles.heads}>
          {[
            { side: 'A', role: roleA },
            { side: 'B', role: roleB },
          ].map(({ side, role }) => (
            <Card
              key={side}
              variant="filled"
              className={styles.head}
              aria-label={`Role ${side}: ${nameOf(role)}`}
            >
              <div className={styles.headTop}>
                <span
                  className={`${styles.side} ${side === 'A' ? styles.sideA : styles.sideB}`}
                  aria-hidden="true"
                >
                  {side}
                </span>
                <span className={styles.headTitle}>{nameOf(role)}</span>
                <span className={styles.headTotal}>{fmt(role.perms.length)}</span>
              </div>
              {role.source.kind === 'custom' && <SourceBadge parent={role.source.parent} />}
              <PrivilegeBar {...index.profile(role)} size="thin" />
            </Card>
          ))}
        </div>
      )}

      {diff && roleA && roleB && (
        <>
          {roleA.name === roleB.name && (
            <p className={styles.same}>Both sides are the same role, so everything is shared.</p>
          )}
          <Overview a={diff.onlyA.length} shared={diff.shared.length} b={diff.onlyB.length} />
          <DiffSection
            index={index}
            kind="onlyA"
            title="Only in A"
            caption={nameOf(roleA)}
            permissions={diff.onlyA}
            onCopy={() => void copy(diff.onlyA, 'only-in-A')}
          />
          <DiffSection
            index={index}
            kind="onlyB"
            title="Only in B"
            caption={nameOf(roleB)}
            permissions={diff.onlyB}
            onCopy={() => void copy(diff.onlyB, 'only-in-B')}
          />
          <DiffSection
            index={index}
            kind="shared"
            title="Shared"
            caption="Granted by both"
            permissions={diff.shared}
            onCopy={() => void copy(diff.shared, 'shared')}
          />
        </>
      )}

      {!(roleA && roleB) && (
        <EmptyState
          title="Compare two roles"
          hint="Pick a role on each side to see what one grants over the other."
          examples={[
            { text: 'viewer vs editor', kind: 'phrase' },
            { text: 'storage.admin vs storage.objectAdmin', kind: 'phrase' },
          ]}
          onPick={(q) => {
            const [x, y] = q.split(' vs ');
            set({ a: `roles/${x}`, b: `roles/${y}` });
          }}
        />
      )}
      <Snackbar message={message} onClose={closeSnack} />
    </article>
  );
}

/** Proportional strip: only-A | shared | only-B. */
function Overview({ a, shared, b }: { a: number; shared: number; b: number }) {
  return (
    <div className={styles.overview}>
      <div
        role="img"
        aria-label={`${fmt(a)} only in A, ${fmt(shared)} shared, ${fmt(b)} only in B`}
        className={styles.strip}
      >
        {a > 0 && <span className={styles.segA} style={{ flexGrow: a }} />}
        {shared > 0 && <span className={styles.segS} style={{ flexGrow: shared }} />}
        {b > 0 && <span className={styles.segB} style={{ flexGrow: b }} />}
      </div>
      <ul className={styles.stripLegend} aria-hidden="true">
        <li className={styles.lA}>
          <b>{fmt(a)}</b> only A
        </li>
        <li className={styles.lS}>
          <b>{fmt(shared)}</b> shared
        </li>
        <li className={styles.lB}>
          <b>{fmt(b)}</b> only B
        </li>
      </ul>
    </div>
  );
}
