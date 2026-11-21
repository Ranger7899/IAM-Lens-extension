import { useEffect, useRef, useState } from 'react';
import { EmptyState, Fab, SearchBar, Snackbar, TopAppBar } from '@/ui/components';
import { EXAMPLE_QUERIES } from '@/ui/demo';
import styles from './App.module.css';

export function App() {
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Resolved ahead of time so the click handler can call sidePanel.open() synchronously
  // (the call must happen inside the user gesture).
  const windowId = useRef<number | undefined>(undefined);

  useEffect(() => {
    void chrome.windows.getCurrent().then((w) => {
      windowId.current = w.id;
    });
  }, []);

  const openDetails = () => {
    if (windowId.current === undefined) return;
    void chrome.sidePanel.open({ windowId: windowId.current });
    window.close();
  };

  return (
    <main className={styles.root}>
      <TopAppBar title="IAM Lens" />
      <div className={styles.body} onScroll={(e) => setCollapsed(e.currentTarget.scrollTop > 16)}>
        <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
        <EmptyState
          title="Look up any permission or role"
          hint="Tap an example to copy it, or just start typing."
          examples={EXAMPLE_QUERIES}
          onPick={(q) => setToast(`Copied ${q}`)}
        />
      </div>
      <Fab
        className={styles.fab}
        icon="side_navigation"
        label="Open details"
        collapsed={collapsed}
        onClick={openDetails}
      />
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </main>
  );
}
