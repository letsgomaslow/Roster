import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ pathname: '/' }));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));

import { ClerkBootstrapFallback } from './ClerkBootstrapFallback';

describe('ClerkBootstrapFallback', () => {
  beforeEach(() => {
    state.pathname = '/';
  });

  it('shows the stable workspace frame instead of flashing the public home during Clerk loading', () => {
    const html = renderToStaticMarkup(
      createElement(ClerkBootstrapFallback, { authSurfaceState: 'loading' }),
    );

    expect(html).toContain('Preparing your workspace');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('AI employees for the work that waits on your busiest people.');
    expect(html).not.toContain('Sign in');
  });

  it('keeps protected routes in the same loading frame until identity resolves', () => {
    state.pathname = '/library';

    const html = renderToStaticMarkup(
      createElement(ClerkBootstrapFallback, { authSurfaceState: 'loading' }),
    );

    expect(html).toContain('Preparing your Library');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Sign in');
  });
});
