import { Button, Icon } from '@/ui/components';
import styles from './MovedScreen.module.css';

/** Old deep links (`#/whatsnew`) land here: the snapshot diff now lives in Settings. */
export function WhatsNewScreen() {
  return (
    <section className={styles.root} aria-labelledby="wn-moved">
      <span className={styles.badge} aria-hidden="true">
        <Icon name="new_releases" size={40} filled />
      </span>
      <h2 id="wn-moved" className={styles.title}>
        What&rsquo;s new moved to Settings
      </h2>
      <p className={styles.text}>See what changed in the role data under Settings, in Role data.</p>
      <Button
        variant="tonal"
        icon="settings"
        onClick={() => void chrome.tabs.create({ url: chrome.runtime.getURL('options.html#whatsnew') })}
      >
        Open What&rsquo;s new in Settings
      </Button>
    </section>
  );
}
