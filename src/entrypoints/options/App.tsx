import { Card, SearchBar, TopAppBar, Button } from '@/ui/components';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.root}>
      <TopAppBar title="IAM Lens options" />
      <main className={styles.main}>
        <Card variant="outlined">
          <h2>Custom roles</h2>
          <p>Sign in to include your organization and project custom roles. Coming soon.</p>
          <Button variant="tonal" icon="login" disabled>
            Sign in with Google
          </Button>
        </Card>
        <SearchBar label="Placeholder search" disabled />
      </main>
    </div>
  );
}
