import { SegmentedButton } from '@/ui/components';
import { useThemePreference, type ThemePreference } from '@/ui/theme/useThemePreference';
import { Section } from './Section';

export function AppearanceCard() {
  const [pref, setPref] = useThemePreference();
  return (
    <Section icon="settings" title="Appearance" subtitle="Applies to the popup, side panel and this page.">
      <SegmentedButton
        label="Theme"
        value={pref}
        onChange={(id) => setPref(id as ThemePreference)}
        segments={[
          { id: 'system', label: 'System' },
          { id: 'light', label: 'Light' },
          { id: 'dark', label: 'Dark' },
        ]}
      />
    </Section>
  );
}
