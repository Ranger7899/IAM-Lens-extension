import { useEffect, useState } from 'react';
import { ChromeOnlyError, type AuthMethod } from '@/core/gcp';
import { Button, Dialog, Icon, Snackbar } from '@/ui/components';
import { signalCustomRolesChanged } from '@/ui/data';
import { useCustomSync } from '@/ui/data/useCustomSync';
import type { OptionsDeps } from './deps';
import { describeError, plural, relativeTime } from './format';
import { Section } from './Section';
import { TrustSheet } from './TrustSheet';
import styles from './CustomRolesCard.module.css';

export function CustomRolesCard({ deps }: { deps: OptionsDeps }) {
  const s = useCustomSync(deps);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [trustMethod, setTrustMethod] = useState<AuthMethod | null>(null);
  const trustOpen = trustMethod !== null;
  const setTrustOpen = (open: boolean) => !open && setTrustMethod(null);
  const [method, setMethod] = useState<AuthMethod | undefined>(undefined);
  const webAvailable = deps.webSignInAvailable === true;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.resolve(deps.needsScopeUpgrade?.() ?? false).then((up) => live && setNeedsUpgrade(up));
    void Promise.resolve(deps.authMethod?.()).then((m) => live && setMethod(m));
    return () => {
      live = false;
    };
  }, [deps]);

  /** Always called directly from a click handler so the permission prompt keeps its user gesture. */
  const startSignIn = async (chosen: AuthMethod = method ?? 'chrome') => {
    setAuthError(null);
    const pending = deps.signIn({ method: chosen });
    setTrustMethod(null);
    try {
      await pending;
      setMethod((await deps.authMethod?.()) ?? chosen);
      s.markSignedIn();
      setNeedsUpgrade((await deps.needsScopeUpgrade?.()) ?? false);
      void s.syncNow();
    } catch (e) {
      const msg = describeError(e).message;
      setAuthError(
        e instanceof ChromeOnlyError && webAvailable
          ? `${msg} Try "Use a different Google account" instead.`
          : msg,
      );
    }
  };

  const signOutAndClear = async () => {
    await deps.signOut();
    // signOut() clears the stored roles; drop the source list too.
    await deps.patchMeta({ customSources: [], customSyncedAt: undefined });
    signalCustomRolesChanged();
    s.markSignedOut();
    setNeedsUpgrade(false);
    setMethod(undefined);
  };

  const { summary } = s;
  const withRoles = s.sources.filter((r) => (r.roleCount ?? 0) > 0);
  const hasSources = s.sources.length > 0;
  const signedIn = s.signedIn === true;
  const reauth = signedIn && (needsUpgrade || s.authError !== null);

  return (
    <Section
      icon="key"
      title="Custom roles"
      subtitle="Include the custom roles from all your organizations and projects in search."
      aside={
        signedIn ? (
          <span className={styles.signed}>
            <Icon name="check" size={16} /> Signed in
          </span>
        ) : undefined
      }
    >
      {s.signedIn === null && <p>Checking sign-in…</p>}

      {s.signedIn === false && !hasSources && (
        <>
          <p>
            Sign in once with the Google account that can see your Cloud projects. IAM Lens then includes
            every project and organization that account can access, read-only, and fetches custom role
            definitions straight from Google to this browser. They stay on this device. Custom-role sign-in
            works in Google Chrome with the account signed in to your Chrome profile
            {webAvailable ? ', or with any other Google account (also in Edge and Brave)' : ''}.
          </p>
          <div className={styles.actions}>
            <Button variant="filled" icon="login" onClick={() => setTrustMethod('chrome')}>
              Sign in with Google (Chrome account)
            </Button>
            {webAvailable && (
              <Button variant="text" onClick={() => setTrustMethod('web')}>
                Use a different Google account
              </Button>
            )}
          </div>
        </>
      )}

      {s.signedIn === false && hasSources && (
        <p className={styles.banner} role="status">
          <Icon name="info" size={18} />
          <span>
            Your Google session ended. Cached custom roles still work. Sign in again to refresh them.
          </span>
          <Button variant="tonal" icon="login" onClick={() => void startSignIn(method)}>
            Sign in again
          </Button>
        </p>
      )}

      {reauth && (
        <p className={styles.banner} role="status">
          <Icon name="info" size={18} />
          <span>
            {needsUpgrade
              ? 'IAM Lens needs an updated permission to list custom roles. Sign in again to grant it.'
              : (s.authError?.message ?? 'Your Google session ended. Sign in again to refresh.')}
          </span>
          <Button variant="tonal" icon="login" onClick={() => void startSignIn(method)}>
            Sign in again
          </Button>
        </p>
      )}

      {authError && (
        <p className={styles.error} role="alert">
          <Icon name="error" size={18} />
          <span>{authError}</span>
        </p>
      )}

      {signedIn && s.error && !reauth && (
        <p className={styles.error} role="alert">
          <Icon name="error" size={18} />
          <span>{s.error.message}</span>
        </p>
      )}

      {signedIn && (
        <p className={styles.summary} data-auth-method={method ?? 'chrome'}>
          {method === 'web'
            ? 'Signed in with another Google account (session lasts about an hour).'
            : 'Signed in with your Chrome account.'}
        </p>
      )}

      {signedIn && (
        <p className={styles.summary} role="status" data-sync-summary>
          {s.syncing ? (
            'Syncing custom roles…'
          ) : s.syncedAt ? (
            <>
              <strong>{plural(summary.roles, 'custom role')}</strong> from{' '}
              {plural(summary.projects, 'project')} and {plural(summary.organizations, 'organization')}. Last
              synced {relativeTime(s.syncedAt)}.
              {summary.noAccess > 0 && ` ${plural(summary.noAccess, 'source')} had no access.`}
            </>
          ) : (
            'Not synced yet.'
          )}
        </p>
      )}

      {signedIn && withRoles.length > 0 && (
        <details className={styles.sources}>
          <summary>Sources with custom roles ({withRoles.length})</summary>
          <ul>
            {withRoles.map((r) => (
              <li key={r.parent}>
                <span>{r.displayName}</span>
                <span className={styles.mono}>{r.parent}</span>
                <span>{plural(r.roleCount ?? 0, 'role')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {signedIn && (
        <div className={styles.actions}>
          <Button variant="tonal" icon="refresh" disabled={s.syncing} onClick={() => void s.syncNow()}>
            {s.syncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <span className={styles.spacer} />
          <Button variant="text" className={styles.danger} onClick={() => setConfirmOpen(true)}>
            Sign out &amp; clear
          </Button>
        </div>
      )}

      <TrustSheet
        open={trustOpen}
        method={trustMethod ?? 'chrome'}
        onClose={() => setTrustOpen(false)}
        onContinue={() => void startSignIn(trustMethod ?? 'chrome')}
      />

      <Dialog
        open={confirmOpen}
        title="Sign out and clear custom roles?"
        onClose={() => setConfirmOpen(false)}
        actions={
          <>
            <Button variant="text" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              className={styles.dangerFilled}
              onClick={() => {
                setConfirmOpen(false);
                void signOutAndClear().then(() => setToast('Signed out. Custom roles cleared.'));
              }}
            >
              Sign out &amp; clear
            </Button>
          </>
        }
      >
        <p className={styles.dialogText}>
          This revokes IAM Lens&apos;s access to your Google account and deletes{' '}
          {plural(summary.roles, 'custom role')} stored in this browser, along with your source list.
          Predefined roles are not affected.
        </p>
      </Dialog>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </Section>
  );
}
