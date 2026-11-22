import { IamGate } from '@/ui/data';
import { LensMark } from '@/ui/components';
import { useThemePreference } from '@/ui/theme/useThemePreference';
import { useWhatsNew } from '@/ui/whatsnew/useWhatsNew';
import { WhatsNewCard } from './WhatsNewCard';
import { AboutCard } from './AboutCard';
import { AppearanceCard } from './AppearanceCard';
import { CustomRolesCard } from './CustomRolesCard';
import { DataCard } from './DataCard';
import { SidePanelCard } from './SidePanelCard';
import type { OptionsDeps } from './deps';
import styles from './App.module.css';

export function App({ deps }: { deps: OptionsDeps }) {
  useThemePreference();
  const whatsNew = useWhatsNew(deps.whatsNew);
  return (
    <div className={styles.root}>
      <header className={styles.top}>
        <LensMark size={32} />
        <div>
          <h1>IAM Lens</h1>
          <p>Options</p>
        </div>
      </header>
      <div className={styles.panel}>
        <main className={styles.main}>
          <IamGate>
            <DataCard deps={deps} whatsNew={whatsNew} />
            <WhatsNewCard deps={deps} state={whatsNew} />
          </IamGate>
          <CustomRolesCard deps={deps} />
          <AppearanceCard />
          <SidePanelCard />
          <AboutCard version={deps.version} />
        </main>
      </div>
    </div>
  );
}
