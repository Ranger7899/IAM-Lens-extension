import { IamGate } from '@/ui/data';
import { LensMark } from '@/ui/components';
import { useThemePreference } from '@/ui/theme/useThemePreference';
import { AboutCard } from './AboutCard';
import { AppearanceCard } from './AppearanceCard';
import { CustomRolesCard } from './CustomRolesCard';
import { DataCard } from './DataCard';
import type { OptionsDeps } from './deps';
import styles from './App.module.css';

export function App({ deps }: { deps: OptionsDeps }) {
  useThemePreference();
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
        <IamGate>
          <DataCard deps={deps} />
        </IamGate>
        <CustomRolesCard deps={deps} />
        <AppearanceCard />
        <AboutCard version={deps.version} />
      </main>
    </div>
  );
}
