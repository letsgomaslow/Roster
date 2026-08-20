import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clerkMocks = vi.hoisted(() => ({ organizationHookCalls: 0 }));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true }),
  useClerk: () => ({ openInviteMembers: () => undefined }),
  useOrganization: () => {
    clerkMocks.organizationHookCalls += 1;
    return { organization: null };
  },
  useUser: () => ({ user: { firstName: 'Alex', fullName: 'Alex Morgan' } }),
}));

vi.mock('./GettingStartedScreen', () => ({
  GettingStartedScreen: ({ displayName }: { displayName?: string }) =>
    createElement('div', null, `Getting started for ${displayName ?? 'member'}`),
}));

import { ClerkAwareGettingStartedScreen } from './ClerkAwareGettingStartedScreen';

describe('ClerkAwareGettingStartedScreen', () => {
  beforeEach(() => {
    clerkMocks.organizationHookCalls = 0;
    delete process.env.NEXT_PUBLIC_CLERK_ORGANIZATIONS_ENABLED;
  });

  it('opens the personal-workspace path without invoking disabled organization features', () => {
    const html = renderToStaticMarkup(createElement(ClerkAwareGettingStartedScreen));

    expect(html).toContain('Getting started for Alex');
    expect(clerkMocks.organizationHookCalls).toBe(0);
  });
});
