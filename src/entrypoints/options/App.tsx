import type { ReactNode } from 'react';
import { Button, Card, Icon, LensMark, type IconName } from '@/ui/components';
import styles from './App.module.css';

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <Card variant="filled" className={styles.card}>
      <span className={styles.tile}>
        <Icon name={icon} size={22} />
      </span>
      <div className={styles.cardBody}>
        <h2>{title}</h2>
        {children}
      </div>
    </Card>
  );
}

export function App() {
  return (
    <div className={`${styles.root} dot-grid`}>
      <header className={styles.top}>
        <LensMark size={40} />
        <div>
          <h1>IAM Lens</h1>
          <p>Options</p>
        </div>
      </header>
      <main className={styles.main}>
        <Section icon="key" title="Custom roles">
          <p>Sign in to include your organization and project custom roles. Coming soon.</p>
          <Button variant="tonal" icon="login" disabled>
            Sign in with Google
          </Button>
        </Section>
        <Section icon="info" title="Role data">
          <p>
            Predefined roles ship inside the extension and work offline. Update checks only fetch the public
            roles reference.
          </p>
        </Section>
        <Section icon="shield" title="Privacy">
          <p>
            Searches stay on this device. IAM Lens has no analytics and never sends what you type anywhere.
          </p>
        </Section>
      </main>
    </div>
  );
}
