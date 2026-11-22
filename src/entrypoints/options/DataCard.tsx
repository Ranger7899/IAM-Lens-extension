import { useEffect, useState } from 'react';
import type { UpdateResult } from '@/core';
import { Button, Icon } from '@/ui/components';
import { useIam } from '@/ui/data';
import type { useWhatsNew } from '@/ui/whatsnew/useWhatsNew';
import { formatDate, n } from '@/ui/whatsnew/format';
import type { OptionsDeps } from './deps';
import { describeUpdate, relativeTime, shortDate } from './format';
import { Section } from './Section';
import styles from './DataCard.module.css';

export function DataCard({
  deps,
  whatsNew,
}: {
  deps: OptionsDeps;
  whatsNew: ReturnType<typeof useWhatsNew>;
}) {
  const iam = useIam();
  const [last, setLast] = useState<{ at?: string; result?: UpdateResult }>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void deps.getMeta().then((m) =>
      setLast({
        at: (m.lastCheck as string | undefined) ?? m.lastCheckedAt,
        result: m.lastResult as UpdateResult | undefined,
      }),
    );
  }, [deps]);

  const check = async () => {
    setChecking(true);
    try {
      const result = await deps.refreshNow();
      setLast({ at: new Date().toISOString(), result });
      if (result.status === 'updated') iam.retry();
    } catch (e) {
      setLast({
        at: new Date().toISOString(),
        result: { status: 'error', message: e instanceof Error ? e.message : String(e) },
      });
    } finally {
      setChecking(false);
    }
  };

  const status = describeUpdate(last.result);
  const ready = iam.status === 'ready';
  const stats = [
    {
      label: 'Snapshot',
      value: ready ? iam.snapshotMeta.version : '…',
      mono: true,
      note: ready ? shortDate(iam.snapshotMeta.generatedAt) : '',
    },
    {
      label: 'Roles',
      value: ready
        ? iam.index.roles.filter((r) => r.source.kind === 'predefined').length.toLocaleString('en')
        : '…',
      note: ready ? 'predefined' : '',
    },
    {
      label: 'Permissions',
      value: ready ? iam.index.permissions.length.toLocaleString('en') : '…',
      note: 'distinct',
    },
  ];
  return (
    <Section
      icon="info"
      title="Role data"
      subtitle="Predefined roles ship inside the extension and work offline."
    >
      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <dt>{s.label}</dt>
            <dd className={s.mono ? styles.mono : undefined}>{s.value}</dd>
            <dd className={styles.note}>{s.note}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.row}>
        <p className={`${styles.status} ${styles[status.tone]}`} role="status">
          <Icon name={status.tone === 'warn' ? 'error' : status.tone === 'ok' ? 'check' : 'info'} size={18} />
          <span>
            <strong>{status.text}</strong>
            <span className={styles.when}>
              {last.at ? `Last check ${relativeTime(last.at)}` : 'Checks run once a day in the background'}
            </span>
            {whatsNew.status === 'ready' && <ChangesLink s={whatsNew} />}
          </span>
        </p>
        <Button variant="tonal" icon="refresh" onClick={check} disabled={checking}>
          {checking ? 'Checking…' : 'Check for updates'}
        </Button>
      </div>
    </Section>
  );
}

/** "N changes since Oct 28" -> the What's new section below. */
function ChangesLink({ s }: { s: Extract<ReturnType<typeof useWhatsNew>, { status: 'ready' }> }) {
  const d = s.diff;
  const total =
    d.rolesAdded.length +
    d.rolesRemoved.length +
    d.rolesChanged.length +
    d.permissionsAdded.length +
    d.permissionsRemoved.length;
  const text = total === 0 ? 'No changes' : `${n(total)} ${total === 1 ? 'change' : 'changes'}`;
  return (
    <a className={styles.changes} href="#whatsnew">
      {text} since {formatDate(s.previous.generatedAt)}
    </a>
  );
}
