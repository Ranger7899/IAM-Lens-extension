import { useState } from 'react';
import { EmptyState, SearchBar, SegmentedButton, Snackbar, TopAppBar, IconButton } from '@/ui/components';
import { EXAMPLE_QUERIES } from '@/ui/demo';
import styles from './App.module.css';

const MODES = [
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'minimal', label: 'Minimal roles', icon: 'target' },
  { id: 'compare', label: 'Compare', icon: 'compare_arrows' },
  { id: 'new', label: "What's new", icon: 'new_releases' },
];

export function App() {
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className={`${styles.root} dot-grid`}>
      <TopAppBar
        title="IAM Lens"
        actions={
          <IconButton
            icon="settings"
            label="Settings"
            onClick={() => void chrome.runtime.openOptionsPage()}
          />
        }
      >
        <SegmentedButton label="Mode" segments={MODES} value={mode} onChange={setMode} />
      </TopAppBar>
      <main className={styles.main}>
        {mode === 'search' ? (
          <>
            <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
            <EmptyState
              title="Look up any permission or role"
              hint="Find which roles grant a permission, or which permissions a role has."
              examples={EXAMPLE_QUERIES}
              onPick={(q) => setToast(`Copied ${q}`)}
            />
          </>
        ) : (
          <EmptyState title={MODES.find((m) => m.id === mode)!.label} hint="Coming soon." examples={[]} />
        )}
      </main>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
