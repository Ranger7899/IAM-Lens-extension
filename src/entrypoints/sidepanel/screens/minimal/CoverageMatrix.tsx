import { Icon, PermissionToken, type Risk } from '@/ui/components';
import type { MinimalRolesResult } from '@/core';
import styles from './minimal.module.css';

export interface CoverageMatrixProps {
  result: MinimalRolesResult;
  riskOf: (perm: string) => Risk | undefined;
}

/** Permissions x chosen roles; a check where the role grants the permission. Columns match the numbered role cards. */
export function CoverageMatrix({ result, riskOf }: CoverageMatrixProps) {
  const perms = Object.keys(result.coverage);
  const cols = result.roles.map((r) => r.role.name);
  if (perms.length === 0 || cols.length === 0) return null;
  return (
    <section className={styles.matrixWrap} aria-labelledby="matrix-h">
      <h3 id="matrix-h" className={styles.sectionTitle}>
        Coverage matrix
      </h3>
      <div className={styles.matrixScroll}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th scope="col" className={styles.mPerm}>
                Permission
              </th>
              {cols.map((c, i) => (
                <th key={c} scope="col" className={styles.mCol} title={c}>
                  <span className={styles.num}>{i + 1}</span>
                  <span className="sr-only">{c}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {perms.map((p) => (
              <tr key={p}>
                <th scope="row" className={styles.mPerm}>
                  <PermissionToken permission={p} risk={riskOf(p)} static />
                </th>
                {cols.map((c) => {
                  const yes = result.coverage[p].includes(c);
                  return (
                    <td key={c} className={styles.mCell} data-covered={yes}>
                      {yes ? (
                        <>
                          <Icon name="check" size={18} className={styles.tick} />
                          <span className="sr-only">granted by {c}</span>
                        </>
                      ) : (
                        <span className={styles.dash} aria-hidden="true" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
