import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/library' }));
vi.mock('@/app/components/control-plane/AuthCtas', () => ({
  AuthCtas: () => createElement('div', null, 'Sign in'),
}));

import { RouteStatusScreen } from './RouteStatusScreen';

describe('RouteStatusScreen', () => {
  it('keeps signed-out Library guidance simple and outcome-focused', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStatusScreen, {
        authSurfaceState: 'ready',
        mode: 'signed_out',
        pathname: '/library',
      }),
    );

    expect(html).toContain('Sign in to open your team’s Library');
    expect(html).toContain('Find trusted work');
    expect(html).not.toMatch(/Clerk|JWT|endpoint|orchestration|control plane/i);
  });

  it('explains the Setup Center as optional instead of an onboarding dependency', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStatusScreen, {
        authSurfaceState: 'ready',
        mode: 'signed_out',
        pathname: '/integrations',
      }),
    );

    expect(html).toContain('Sign in to open the Setup Center');
    expect(html).toContain('optional');
    expect(html).not.toMatch(/smoke test|host config|endpoint/i);
  });

  it('explains that curators can organize Library labels without granting admin controls', () => {
    const html = renderToStaticMarkup(
      createElement(RouteStatusScreen, {
        authSurfaceState: 'ready',
        mode: 'signed_out',
        pathname: '/workspace-admin',
      }),
    );

    expect(html).toContain('Sign in to manage Library settings');
    expect(html).toContain('Curators organize teams and work types');
    expect(html).toContain('Owners and admins also manage workspace controls');
    expect(html).not.toContain('Workspace owners and admins manage people');
  });
});
