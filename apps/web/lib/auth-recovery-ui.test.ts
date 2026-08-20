import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthSurfaceNotice } from '@/app/components/control-plane/AuthSurfaceNotice';

describe('authentication recovery copy', () => {
  it('describes a short wait in user language while sign-in loads', () => {
    const html = renderToStaticMarkup(
      createElement(AuthSurfaceNotice, { authSurfaceState: 'loading' }),
    );

    expect(html).toContain('Getting Roster ready');
    expect(html).not.toContain('Clerk');
    expect(html).not.toContain('hosted auth');
  });

  it('offers one recovery action without exposing configuration internals', () => {
    const html = renderToStaticMarkup(
      createElement(AuthSurfaceNotice, { authSurfaceState: 'failed' }),
    );

    expect(html).toContain('Sign-in is temporarily unavailable');
    expect(html).toContain('Reload and retry');
    expect(html).not.toContain('JWT');
    expect(html).not.toContain('key mismatch');
  });
});
