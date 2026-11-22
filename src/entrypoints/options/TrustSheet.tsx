import { Button, Dialog, Icon, type IconName } from '@/ui/components';
import { OAUTH_CLIENT_ID, WEB_OAUTH_CLIENT_ID, WEB_OAUTH_REDIRECT_URI } from '@/core/gcp/authConfig';
import { IAM_SOURCE_URL, REVOKE_URL, SOURCE_URL } from './constants';
import styles from './TrustSheet.module.css';

interface Point {
  icon: IconName;
  title: string;
  body: React.ReactNode;
}

const link = (href: string, text: string) => (
  <a href={href} target="_blank" rel="noreferrer noopener">
    {text}
  </a>
);

const POINTS: Point[] = [
  {
    icon: 'visibility',
    title: 'Read-only',
    body: 'IAM Lens reads role definitions only. It never sees IAM policies, resources or your data, and it cannot change anything.',
  },
  {
    icon: 'badge',
    title: 'Google will say "Manage your IAM policies"',
    body: (
      <>
        Google has no read-only option for listing roles, so its screen uses that wording. IAM Lens only reads
        role definitions (list and get) and never changes anything.{' '}
        {link(IAM_SOURCE_URL, 'See the exact API calls')}.
      </>
    ),
  },
  {
    icon: 'key',
    title: 'Stays in this browser',
    body: 'Your access token lives in this browser session and the roles are stored on this device. Nothing is sent to us: there is no server.',
  },
  {
    icon: 'shield',
    title: 'Revoke any time',
    body: (
      <>
        Remove access on {link(REVOKE_URL, 'your Google Account permissions page')}, or use Sign out &amp;
        clear here.
      </>
    ),
  },
  {
    icon: 'target',
    title: 'Who is asking',
    body: (
      <>
        Google shows the app name IAM Lens. The OAuth client it uses is:
        <code className={styles.clientId}>{OAUTH_CLIENT_ID}</code>
      </>
    ),
  },
  {
    icon: 'info',
    title: 'Unverified app screen',
    body: 'While IAM Lens is in testing, Google shows an "unverified app" screen. That is expected: choose Continue there.',
  },
];

/** The web method differs from the default in who is asking and how the token reaches the extension. */
const WEB_POINTS: Point[] = POINTS.map((p) => {
  if (p.title === 'Stays in this browser') {
    return {
      ...p,
      body: (
        <>
          Google sends the token to a small page on our own domain,{' '}
          <code className={styles.clientId}>{WEB_OAUTH_REDIRECT_URI}</code>, in the address fragment, which is
          never sent to a server. That page only forwards it to this extension and clears it. The token and
          the roles stay on this device. Sessions last about an hour.
        </>
      ),
    };
  }
  if (p.title === 'Who is asking') {
    return {
      ...p,
      body: (
        <>
          Google shows the app name IAM Lens and lets you pick any Google account. The OAuth client it uses
          is:
          <code className={styles.clientId}>{WEB_OAUTH_CLIENT_ID}</code>
        </>
      ),
    };
  }
  return p;
});

export interface TrustSheetProps {
  open: boolean;
  /** Which sign-in the Continue button runs; changes the "who is asking" and token-path points. Default `chrome`. */
  method?: 'chrome' | 'web';
  onClose: () => void;
  /** Called straight from the click so the browser keeps the user gesture for the permission prompt. */
  onContinue: () => void;
}

/** "Before you sign in": the trust summary shown first, so consent is informed. */
export function TrustSheet({ open, method = 'chrome', onClose, onContinue }: TrustSheetProps) {
  const points = method === 'web' ? WEB_POINTS : POINTS;
  return (
    <Dialog
      open={open}
      title="Before you sign in"
      onClose={onClose}
      actions={
        <>
          <Button variant="text" onClick={onClose}>
            Not now
          </Button>
          <Button variant="filled" icon="login" onClick={onContinue}>
            Continue
          </Button>
        </>
      }
    >
      <ul className={styles.list}>
        {points.map((p) => (
          <li key={p.title} className={styles.item}>
            <span className={styles.tile}>
              <Icon name={p.icon} size={20} />
            </span>
            <span>
              <strong className={styles.head}>{p.title}</strong>
              <span className={styles.text}>{p.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.source}>
        {link(SOURCE_URL, 'View the source')} and check what the extension does.
      </p>
    </Dialog>
  );
}
