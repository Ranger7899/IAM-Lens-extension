// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
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
});
