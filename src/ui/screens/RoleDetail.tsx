import { useState, type CSSProperties } from 'react';
import { Card, Icon, IconButton, IdToken, PrivilegeBar, StageChip, type IconName } from '../components';
import type { PermissionEntry, Risk, RoleDetailData } from '../types';
import { total } from './parts';
import styles from './RoleDetail.module.css';

export interface RoleDetailProps {
  role: RoleDetailData;
  onBack: () => void;
  onOpenPermission: (id: string) => void;
  onCopied?: (text: string) => void;
}

const RISK_ICON: Record<Risk, IconName> = { read: 'visibility', write: 'edit', admin: 'shield' };

function groupByService(perms: PermissionEntry[]): [string, PermissionEntry[]][] {
  const map = new Map<string, PermissionEntry[]>();
  for (const p of perms) {
    const service = p.id.split('.')[0];
    map.set(service, [...(map.get(service) ?? []), p]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function RoleDetail({ role, onBack, onOpenPermission, onCopied }: RoleDetailProps) {
  const groups = groupByService(role.permissions);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return (
    <article className={styles.root} aria-label={role.title}>
      <div className={styles.back}>
        <IconButton icon="arrow_back" label="Back to results" onClick={onBack} />
      </div>
      <Card variant="filled" className={styles.header}>
        <div className={styles.eyebrow}>
          <StageChip stage={role.stage} />
          <span>Predefined role</span>
        </div>
        <h2 className={styles.title}>{role.title}</h2>
        <IdToken value={role.id} onCopied={onCopied} />
        {role.description && <p className={styles.desc}>{role.description}</p>}
        <div className={styles.spectrum}>
          <div className={styles.spectrumHead}>
            <span>Privilege spectrum</span>
            <span className={styles.total}>{total(role.counts).toLocaleString('en-US')} permissions</span>
          </div>
          <PrivilegeBar {...role.counts} legendStyle="full" />
        </div>
      </Card>

      {groups.map(([service, perms], gi) => {
        const open = !collapsed[service];
        return (
          <section key={service} className={styles.group}>
            <h3 className={styles.subheader}>
              <button
                type="button"
                aria-expanded={open}
                className={styles.toggle}
                onClick={() => setCollapsed((c) => ({ ...c, [service]: open }))}
              >
                <span className={styles.service}>{service}</span>
                <span className={styles.groupCount}>{perms.length}</span>
                <Icon name="expand_more" className={`${styles.chev} ${open ? styles.open : ''}`} />
              </button>
            </h3>
            {open && (
              <ul className={styles.perms}>
                {perms.map((p, i) => (
                  <li
                    key={p.id}
                    className={`${styles.perm} reveal`}
                    style={{ '--i': i + gi } as CSSProperties}
                  >
                    <button
                      type="button"
                      className={styles.permButton}
                      onClick={() => onOpenPermission(p.id)}
                      aria-label={`${p.id}, ${p.risk} permission`}
                    >
                      <PermissionTokenText id={p.id} risk={p.risk} />
                      <Icon
                        name={RISK_ICON[p.risk]}
                        size={16}
                        filled
                        className={`${styles.riskIcon} ${styles[p.risk]}`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </article>
  );
}

function PermissionTokenText({ id, risk }: { id: string; risk: Risk }) {
  const parts = id.split('.');
  const verb = parts.pop();
  const rest = parts.slice(1).join('.');
  return (
    <span className={styles.token}>
      <span className={styles.tService}>{parts[0]}</span>
      {rest && <span className={styles.tResource}>.{rest}</span>}
      <span className={`${styles.tVerb} ${styles[risk]}`}>.{verb}</span>
    </span>
  );
}
