import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublicBetaHomeScreen } from './PublicBetaHomeScreen';

describe('PublicBetaHomeScreen', () => {
  it('leads with the Maslow position and the complete workflow trust model', () => {
    const html = renderToStaticMarkup(
      createElement(PublicBetaHomeScreen, { authSurfaceState: 'disabled' }),
    );

    expect(html).toContain('AI employees for the work that waits on your busiest people.');
    expect(html).toContain('Turn waiting work into trusted team workflows');
    expect(html).toContain('Workflow');
    expect(html).toContain('Owner');
    expect(html).toContain('Human decision');
    expect(html).toContain('Evidence');
    expect(html).toContain('Start a working session');
    expect(html).not.toMatch(/public beta|bounded|MCP|orchestration/i);
    expect(html).not.toMatch(/linear-gradient|radial-gradient|—/);
  });

  it('keeps the external message available when hosted sign-in is disabled', () => {
    const html = renderToStaticMarkup(
      createElement(PublicBetaHomeScreen, { authSurfaceState: 'disabled' }),
    );

    expect(html).toContain('AI employees for the work that waits on your busiest people.');
    expect(html).toContain('Start a working session');
    expect(html).not.toContain('Getting Roster ready');
  });
});
