import { useState, type CSSProperties } from 'react';
import type { IamIndex } from '@/core';
import { Icon, PermissionToken } from '@/ui/components';
import { useNavigate } from '../../navigation';
import styles from './ServiceSection.module.css';

/** Rows rendered per expanded service before "Show more" (keeps roles/owner's 10k+ rows cheap). */
export const PAGE = 100;

const RISK_ICON = { read: 'visibility', write: 'edit', admin: 'shield' } as const;

const RISK_LABEL = { read: 'Read', write: 'Write', admin: 'Admin' } as const;

export interface ServiceSectionProps {
  index: IamIndex;
  service: string;
  /** Permission indices to show (already filtered). */
  indices: readonly number[];
  /** Unfiltered size of this service within the role. */
  total: number;
  open: boolean;
  onToggle: () => void;
  /** Stagger offset so groups cascade in. */
  order?: number;
}

/** One collapsible service group with a sticky subheader. Rows exist only while expanded. */
export function ServiceSection({
  index,
  service,
  indices,
  total,
  open,
  onToggle,
  order = 0,
}: ServiceSectionProps) {
  const { go } = useNavigate();
  const [shown, setShown] = useState(PAGE);
  const visible = open ? indices.slice(0, shown) : [];
  const count = indices.length === total ? total : `${indices.length} of ${total}`;
  return (
    <section className={styles.group} aria-label={`${service} permissions`}>
      <h3 className={styles.subheader}>
        <button type="button" aria-expanded={open} className={styles.toggle} onClick={onToggle}>
          <Icon name="expand_more" className={`${styles.chev} ${open ? styles.open : ''}`} />
          <span className={styles.service}>{service}</span>
          <span className={styles.count}>{count}</span>
        </button>
      </h3>
      {open && (
        <ul className={styles.perms}>
          {visible.map((idx, i) => {
            const name = index.permissions[idx];
            const risk = index.classOf(idx);
            return (
              <li key={idx} className={styles.perm} style={{ '--i': i + order } as CSSProperties}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => go({ name: 'permission', id: name })}
                  aria-label={`${name}, ${risk} permission`}
                >
                  <PermissionToken permission={name} risk={risk} static />
                  <span className={`${styles.type} ${styles[risk]}`}>
                    <Icon name={RISK_ICON[risk]} size={16} filled className={styles.riskIcon} />
                    {RISK_LABEL[risk]}
                  </span>
                </button>
              </li>
            );
          })}
          {indices.length > shown && (
            <li className={styles.more}>
              <button type="button" className={styles.moreButton} onClick={() => setShown((n) => n + PAGE)}>
                Show {Math.min(PAGE, indices.length - shown)} more
                <span className={styles.moreRest}>
                  {(indices.length - shown).toLocaleString('en-US')} left
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
