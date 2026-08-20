import {
  createElement,
  type ComponentProps,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: vi.fn(),
    isLoaded: authState.isLoaded,
    isSignedIn: authState.isSignedIn,
    sessionClaims: null,
  }),
}));

vi.mock('convex/react', async () => {
  const { createElement: createProviderElement } = await import('react');
  return {
    ConvexProviderWithAuth: ({ children }: { children: ReactNode }) =>
      createProviderElement('div', { 'data-convex-provider': 'true' }, children),
  };
});

vi.mock('convex/react-clerk', async () => {
  const { createElement: createProviderElement } = await import('react');
  return {
    ConvexProviderWithClerk: ({ children }: { children: ReactNode }) =>
      createProviderElement('div', { 'data-clerk-convex-provider': 'true' }, children),
  };
});

vi.mock('@/lib/convex-client', () => ({ convex: {} }));

vi.mock('@/app/components/work-library/WorkspaceContext', async () => {
  const { createElement: createWorkspaceElement } = await import('react');
  return {
    ClerkWorkspaceBootstrap: ({ children }: { children: ReactNode }) =>
      createWorkspaceElement('div', { 'data-workspace-bootstrap': 'true' }, children),
  };
});

import { AppProviders } from './AppProviders';

type TestProviderProps = PropsWithChildren<
  Omit<ComponentProps<typeof AppProviders>, 'children'>
>;
const AppProvidersUnderTest = AppProviders as ComponentType<TestProviderProps>;

function renderProviders() {
  return renderToStaticMarkup(
    createElement(
      AppProvidersUnderTest,
      { clerkEnabled: true },
      createElement('p', null, 'Application'),
    ),
  );
}

describe('AppProviders', () => {
  beforeEach(() => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
  });

  it('does not start workspace bootstrap before a user is signed in', () => {
    expect(renderProviders()).toContain('data-clerk-convex-provider="true"');
    expect(renderProviders()).not.toContain('data-workspace-bootstrap="true"');
  });

  it('starts workspace bootstrap after Clerk confirms a signed-in session', () => {
    authState.isSignedIn = true;
    expect(renderProviders()).toContain('data-workspace-bootstrap="true"');
  });

  it('keeps the application visible while Clerk is still loading', () => {
    authState.isLoaded = false;
    expect(renderProviders()).toContain('Application');
    expect(renderProviders()).not.toContain('data-workspace-bootstrap="true"');
  });
});
