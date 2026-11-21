import { FONT_LICENSE_URL, PRIVACY_URL, SOURCE_URL } from './constants';
import { Section } from './Section';

export function AboutCard({ version }: { version: string }) {
  return (
    <Section icon="shield" title="About" subtitle={`IAM Lens ${version}`}>
      <p>
        Searches stay on this device. IAM Lens has no analytics and never sends what you type anywhere.{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer noopener">
          Privacy policy
        </a>
        {' · '}
        <a href={SOURCE_URL} target="_blank" rel="noreferrer noopener">
          Source
        </a>
      </p>
      <p>
        Fonts: Google Sans Flex and Google Sans Code, bundled under the{' '}
        <a href={FONT_LICENSE_URL} target="_blank" rel="noreferrer noopener">
          SIL Open Font License 1.1
        </a>
        . Icons: Material Symbols, Apache License 2.0.
      </p>
      <p>
        Not affiliated with Google. Google Cloud and related icons are trademarks of Google LLC. Service icons
        are used only to identify services.
      </p>
    </Section>
  );
}
