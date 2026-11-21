import { useState } from 'react';
import { EmptyState, IconButton, LensMark, SearchBar, Tabs, Snackbar, TopAppBar } from '@/ui/components';
import { DemoRouterProvider, DemoSearch, useDemoRouter } from '@/ui/demo';
import styles from './App.module.css';

const MODES: { id: string; label: string }[] = [
  { id: 'search', label: 'Search' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'compare', label: 'Compare' },
  { id: 'new', label: "What's new" },
];

function Body({ onCopied }: { onCopied: (t: string) => void }) {
  const { route, query, setQuery } = useDemoRouter();
  return (
    <div className={`${styles.view} route-view`}>
      {route.name === 'home' && <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />}
      <DemoSearch onCopied={onCopied} />
    </div>
  );
}

export function DemoApp() {
  const [mode, setMode] = useState('search');
  const [toast, setToast] = useState<string | null>(null);
  const copied = (t: string) => setToast(`Copied ${t}`);

  return (
    <div className={styles.root}>
      <TopAppBar
        title="IAM Lens"
        leading={
          <span className={styles.mark}>
            <LensMark size={28} />
          </span>
        }
        actions={
          <IconButton
            icon="settings"
            label="Settings"
            onClick={() => void chrome.runtime.openOptionsPage()}
          />
        }
      />
      <main className={styles.main}>
        <div className={styles.tabs}>
          <Tabs label="Mode" tabs={MODES} value={mode} onChange={setMode} />
        </div>
        {mode === 'search' ? (
          <DemoRouterProvider>
            <Body onCopied={copied} />
          </DemoRouterProvider>
        ) : (
          <EmptyState
            title={MODES.find((m) => m.id === mode)!.label}
            hint="Coming in a later phase."
            examples={[]}
          />
        )}
      </main>
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
