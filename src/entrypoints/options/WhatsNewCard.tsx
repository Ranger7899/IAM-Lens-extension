import { useEffect } from 'react';
import type { useWhatsNew } from '@/ui/whatsnew/useWhatsNew';
import { OpenRouteProvider } from '@/ui/whatsnew/openRoute';
import { WhatsNewView } from '@/ui/whatsnew/WhatsNewScreen';
import type { OptionsDeps } from './deps';
import { Section } from './Section';
import styles from './WhatsNewCard.module.css';

/** The snapshot diff (moved here from the side panel). Role and permission links open the side panel on them. */
export function WhatsNewCard({ deps, state }: { deps: OptionsDeps; state: ReturnType<typeof useWhatsNew> }) {
  // The diff renders after load, so the browser's own #whatsnew scroll has nothing to land on yet.
  const settled = state.status !== 'loading';
  useEffect(() => {
    if (settled && location.hash === '#whatsnew') document.getElementById('whatsnew')?.scrollIntoView();
  }, [settled]);
  return (
    <Section
      id="whatsnew"
      icon="new_releases"
      title="What’s new in the role data"
      subtitle="Roles and permissions added, removed or changed since the previous snapshot. Select one to open it in the side panel."
    >
      <div className={styles.body}>
        <OpenRouteProvider value={deps.openInPanel}>
          <WhatsNewView s={state} bare />
        </OpenRouteProvider>
      </div>
    </Section>
  );
}
