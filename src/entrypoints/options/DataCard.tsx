import { useEffect, useState } from 'react';
import type { UpdateResult } from '@/core';
import { Button, Icon } from '@/ui/components';
import { useIam } from '@/ui/data';
import type { OptionsDeps } from './deps';
import { describeUpdate, relativeTime, shortDate } from './format';
import { Section } from './Section';
import styles from './DataCard.module.css';

export function DataCard({ deps }: { deps: OptionsDeps }) {
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
      value: ready ? iam.index.roles.length.toLocaleString('en') : '…',
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
          </span>
        </p>
        <Button variant="tonal" icon="refresh" onClick={check} disabled={checking}>
          {checking ? 'Checking…' : 'Check for updates'}
        </Button>
      </div>
    </Section>
  );
}
