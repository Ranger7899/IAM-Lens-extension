import { useEffect, useRef, useState } from 'react';
import { EmptyState, Fab, LensMark, SearchBar, Snackbar, TopAppBar } from '@/ui/components';
import { EXAMPLE_QUERIES, parseHash, search } from '@/ui/demo';
import { SearchResults } from '@/ui/screens';
import styles from './App.module.css';

export function App() {
  const [query, setQuery] = useState(() => parseHash(location.hash).query);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Resolved ahead of time so the click handler can call sidePanel.open() synchronously
  // (the call must happen inside the user gesture).
  const windowId = useRef<number | undefined>(undefined);

  useEffect(() => {
    void chrome.windows
      .getCurrent()
      .then((w) => {
        windowId.current = w.id;
      })
      .catch(() => {});
  }, []);

  const openDetails = () => {
    if (windowId.current === undefined) return;
    void chrome.sidePanel.open({ windowId: windowId.current });
    window.close();
  };

  const { roles, permissions } = search(query);
  return (
    <main className={`${styles.root} dot-grid`}>
      <TopAppBar
        title="IAM Lens"
        leading={
          <span className={styles.mark}>
            <LensMark size={26} />
          </span>
        }
      />
      <div className={styles.body} onScroll={(e) => setCollapsed(e.currentTarget.scrollTop > 16)}>
        <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} />
        {query.trim() ? (
          <SearchResults
            roles={roles}
            permissions={permissions}
            limit={3}
            onOpenRole={openDetails}
            onOpenPermission={openDetails}
            onCopied={(t) => setToast(`Copied ${t}`)}
          />
        ) : (
          <EmptyState
            title="Look up any permission or role"
            hint="Tap an example to try it, or just start typing."
            examples={EXAMPLE_QUERIES}
            onPick={setQuery}
          />
        )}
      </div>
      <Fab
        className={styles.fab}
        icon="side_navigation"
        label="Open in side panel"
        collapsed={collapsed}
        onClick={openDetails}
      />
      <Snackbar message={toast} onClose={() => setToast(null)} />
    </main>
  );
}
