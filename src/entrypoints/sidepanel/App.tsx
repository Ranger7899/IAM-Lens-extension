import { IamProvider } from '@/ui/data';
import { useThemePreference } from '@/ui/theme/useThemePreference';
import { DemoApp } from './DemoApp';
import { SidePanelRouter } from './router';

/** `?demo=1` keeps the fixture-backed design shell used for screenshots. */
const DEMO = new URLSearchParams(location.search).get('demo') === '1';

export function App() {
  useThemePreference();
  if (DEMO) return <DemoApp />;
  return (
    <IamProvider>
      <SidePanelRouter />
    </IamProvider>
  );
}
