// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SourcesCtx } from '../data/sourceInfo';
import { SourceBadge, sourceLabel } from './SourceBadge';

describe('SourceBadge', () => {
  it('renders Custom plus the project id', () => {
    const html = renderToStaticMarkup(<SourceBadge parent="projects/my-proj" />);
    expect(html).toContain('Custom');
    expect(html).toContain('my-proj');
    expect(html).not.toContain('projects/my-proj</span>');
  });
  it('strips the collection prefix', () => {
    expect(sourceLabel('organizations/123')).toBe('123');
  });
  it('shows the display name and kind from the synced sources, with the full parent in the tooltip', () => {
    const map = new Map([
      [
        'projects/iam-chrome',
        { parent: 'projects/iam-chrome', kind: 'project' as const, displayName: 'IAM-Chrome' },
      ],
    ]);
    const html = renderToStaticMarkup(
      <SourcesCtx.Provider value={map}>
        <SourceBadge parent="projects/iam-chrome" />
      </SourcesCtx.Provider>,
    );
    expect(html).toContain('IAM-Chrome');
    expect(html).toContain('(project)');
    expect(html).toContain('projects/iam-chrome');
  });
});
