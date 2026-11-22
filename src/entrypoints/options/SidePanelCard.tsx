import { Switch } from '@/ui/components';
import { useSidePanelTabs } from '@/ui/settings/useSidePanelTabs';
import { Section } from './Section';

export function SidePanelCard() {
  const [tabs, setTabs] = useSidePanelTabs();
  return (
    <Section icon="settings" title="Side panel" subtitle="Choose which extra tabs appear next to Search.">
      <Switch
        id="tab-minimal"
        label="Minimal roles finder"
        description="Paste permissions and get the smallest set of roles that covers them."
        checked={tabs.minimal}
        onChange={(v) => setTabs({ minimal: v })}
      />
      <Switch
        id="tab-compare"
        label="Compare roles"
        description="Put two roles side by side and see which permissions differ."
        checked={tabs.compare}
        onChange={(v) => setTabs({ compare: v })}
      />
    </Section>
  );
}
