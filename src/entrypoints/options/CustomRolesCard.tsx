import { useState } from 'react';
import { Button, Dialog, Icon, IconButton, List, ListItem, Snackbar } from '@/ui/components';
import type { OptionsDeps } from './deps';
import { describeError, plural, relativeTime } from './format';
import { Section } from './Section';
import { SourcePicker } from './SourcePicker';
import { useCustomSources, type SourceRecord } from './sources';
import { TrustSheet } from './TrustSheet';
import styles from './CustomRolesCard.module.css';

function SourceRow({
  rec,
  count,
  busy,
  index,
  onRefresh,
  onRemove,
  onSignInAgain,
}: {
  rec: SourceRecord;
  count: number;
  busy: boolean;
  index: number;
  onRefresh: () => void;
  onRemove: () => void;
  onSignInAgain: () => void;
}) {
  return (
    <ListItem
      index={index}
      leadingIcon={rec.kind === 'project' ? 'target' : 'badge'}
      headline={rec.displayName}
      supporting={
        busy ? (
          'Fetching custom roles…'
        ) : (
          <>
            <span className={styles.mono}>{rec.parent}</span>
            {rec.fetchedAt ? (
              <>
                {' · '}
                {plural(count, 'role')}
                {' · '}
                {`fetched ${relativeTime(rec.fetchedAt)}`}
              </>
            ) : (
              ' · not fetched'
            )}
          </>
        )
      }
      extra={
        rec.error && !busy ? (
          <span className={styles.error} role="alert">
            <Icon name="error" size={18} />
            <span>{rec.error.message}</span>
            {rec.error.kind === 'auth' && (
              <Button variant="text" onClick={onSignInAgain}>
                Sign in again
              </Button>
            )}
          </span>
        ) : undefined
      }
      action={
        <>
          <IconButton
            icon="refresh"
            label={`Refresh ${rec.displayName}`}
            size="sm"
            disabled={busy}
            onClick={onRefresh}
          />
          <IconButton icon="close" label={`Remove ${rec.displayName}`} size="sm" onClick={onRemove} />
        </>
      }
    />
  );
}

export function CustomRolesCard({ deps }: { deps: OptionsDeps }) {
  const s = useCustomSources(deps);
  const [trustOpen, setTrustOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /** Always called directly from a click handler so the permission prompt keeps its user gesture. */
  const startSignIn = async () => {
    setAuthError(null);
    const pending = deps.signIn();
    setTrustOpen(false);
    try {
      await pending;
      s.setSignedIn(true);
      void s.refreshAll();
    } catch (e) {
      setAuthError(describeError(e).message);
    }
  };

  const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
  const existing = new Set(s.sources.map((x) => x.parent));
  const hasSources = s.sources.length > 0;
  const signedIn = s.signedIn === true;

  return (
    <Section
      icon="key"
      title="Custom roles"
      subtitle="Include the custom roles from your organizations and projects in search."
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
            Sign in with the Google account that can see your Cloud projects. IAM Lens asks for read-only
            access and fetches custom role definitions straight from Google to this browser. They stay on this
            device.
          </p>
          <div>
            <Button variant="filled" icon="login" onClick={() => setTrustOpen(true)}>
              Sign in with Google
            </Button>
          </div>
        </>
      )}

      {s.signedIn === false && hasSources && (
        <p className={styles.banner} role="status">
          <Icon name="info" size={18} />
          <span>
            Your Google session ended. Cached custom roles still work. Sign in again to refresh them.
          </span>
          <Button variant="tonal" icon="login" onClick={startSignIn}>
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

      {hasSources && (
        <List label="Custom role sources">
          {s.sources.map((rec, i) => (
            <SourceRow
              key={rec.parent}
              rec={rec}
              index={i}
              count={s.counts[rec.parent] ?? 0}
              busy={s.busy.has(rec.parent)}
              onRefresh={() => void s.refresh(rec.parent)}
              onRemove={() => {
                void s.remove(rec.parent).then(() => setToast(`Removed ${rec.displayName}`));
              }}
              onSignInAgain={() => void startSignIn()}
            />
          ))}
        </List>
      )}

      {signedIn && picking && (
        <SourcePicker
          deps={deps}
          existing={existing}
          onAdd={(kind, r) => {
            void s.add(kind, r);
          }}
        />
      )}

      {signedIn && (
        <div className={styles.actions}>
          <Button
            variant={picking ? 'text' : 'tonal'}
            icon={picking ? 'close' : 'search'}
            onClick={() => setPicking(!picking)}
          >
            {picking ? 'Done adding' : 'Add projects or organizations'}
          </Button>
          {hasSources && (
            <Button variant="text" icon="refresh" onClick={() => void s.refreshAll()}>
              Refresh all
            </Button>
          )}
          <span className={styles.spacer} />
          <Button variant="text" className={styles.danger} onClick={() => setConfirmOpen(true)}>
            Sign out &amp; clear
          </Button>
        </div>
      )}

      <TrustSheet
        open={trustOpen}
        onClose={() => setTrustOpen(false)}
        onContinue={() => void startSignIn()}
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
                void s.signOutAndClear().then(() => setToast('Signed out. Custom roles cleared.'));
              }}
            >
              Sign out &amp; clear
            </Button>
          </>
        }
      >
        <p className={styles.dialogText}>
          This revokes IAM Lens&apos;s access to your Google account and deletes{' '}
          {plural(total, 'custom role')} stored in this browser, along with your source list. Predefined roles
          are not affected.
        </p>
      </Dialog>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </Section>
  );
}
