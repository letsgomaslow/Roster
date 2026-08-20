import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PublicBetaHomeScreen } from './PublicBetaHomeScreen';

describe('PublicBetaHomeScreen', () => {
  it('introduces the calm outcome-first Library without technical setup language', () => {
    const html = renderToStaticMarkup(
      createElement(PublicBetaHomeScreen, { authSurfaceState: 'disabled' }),
    );

    expect(html).toContain('Your team’s best AI work, ready when you need it');
    expect(html).toContain('Find trusted work');
    expect(html).toContain('Add the details');
    expect(html).toContain('Use it anywhere');
    expect(html).not.toMatch(/public beta|bounded|MCP|orchestration/i);
    expect(html).not.toContain('linear-gradient');
  });

  it('keeps the public layout stable while sign-in finishes loading', () => {
    const html = renderToStaticMarkup(
      createElement(PublicBetaHomeScreen, { authSurfaceState: 'loading' }),
    );

    expect(html).toContain('Your team’s best AI work, ready when you need it');
    expect(html).toContain('Create workspace');
    expect(html).not.toContain('Getting Roster ready');
  });
});
