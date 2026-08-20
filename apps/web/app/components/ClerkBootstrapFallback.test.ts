import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/library' }));
vi.mock('./screens/RouteStatusScreen', () => ({
  RouteStatusScreen: ({ mode }: { mode: string }) => createElement('p', null, mode),
}));

import { ClerkBootstrapFallback } from './ClerkBootstrapFallback';

describe('ClerkBootstrapFallback', () => {
  it('keeps protected routes on the signed-out layout during the short Clerk load', () => {
    const html = renderToStaticMarkup(
      createElement(ClerkBootstrapFallback, { authSurfaceState: 'loading' }),
    );

    expect(html).toContain('signed_out');
    expect(html).not.toContain('loading');
  });
});
