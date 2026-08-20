import {
  createElement,
  type ComponentProps,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shellState = vi.hoisted(() => ({
  authSurfaceState: 'ready' as 'ready' | 'loading',
  pathname: '/library',
  role: 'contributor' as 'owner' | 'admin' | 'curator' | 'contributor' | 'viewer',
  signedIn: true,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => shellState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', async () => {
  const { createElement: createLinkElement } = await import('react');
  return {
    default: ({
      children,
      className,
      href,
      onClick,
      ...props
    }: {
      children?: ReactNode;
      className?: string;
      href: string;
      onClick?: () => void;
      'aria-current'?: 'page';
      'aria-label'?: string;
    }) =>
      createLinkElement(
        'a',
        { ...props, className, href, onClick, 'data-next-link': 'true' },
        children,
      ),
  };
});

vi.mock('@clerk/nextjs', async () => {
  const { createElement: createClerkElement } = await import('react');
  return {
    OrganizationSwitcher: () => createClerkElement('div', null, 'Workspace switcher'),
    SignInButton: ({ children }: { children: ReactNode }) => children,
    SignUpButton: ({ children }: { children: ReactNode }) => children,
    UserButton: () => createClerkElement('div', null, 'User menu'),
    useAuth: () => ({ isSignedIn: shellState.signedIn }),
  };
});

vi.mock('convex/react', () => ({
  ConvexReactClient: class {},
  useConvexAuth: () => ({ isAuthenticated: shellState.signedIn }),
  useQuery: () => undefined,
}));

vi.mock('@convex/_generated/api', () => ({
  api: { prompts: { listLibrary: 'prompts.listLibrary' } },
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    name: 'Example workspace',
    role: shellState.role,
    status: 'ready',
  }),
}));

vi.mock('./FeedbackDrawer', () => ({
  AuthSurfaceFeedbackDrawer: () => null,
  ClerkFeedbackDrawer: () => null,
  FeedbackDrawer: () => null,
}));

import { ControlPlaneShell } from './ControlPlaneShell';

type TestShellProps = PropsWithChildren<
  Omit<ComponentProps<typeof ControlPlaneShell>, 'children'>
>;
const ControlPlaneShellUnderTest = ControlPlaneShell as ComponentType<TestShellProps>;

function renderShell() {
  return renderToStaticMarkup(
    createElement(
      ControlPlaneShellUnderTest,
      {
        authSurfaceState: shellState.authSurfaceState,
        signedIn: shellState.signedIn,
      },
      createElement('h1', null, 'Current page'),
    ),
  );
}

describe('ControlPlaneShell', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED;
    shellState.authSurfaceState = 'ready';
    shellState.pathname = '/library';
    shellState.role = 'contributor';
    shellState.signedIn = true;
  });

  it('keeps one calm landmark frame for signed-out and signed-in states', () => {
    shellState.signedIn = false;
    const signedOutMarkup = renderShell();
    shellState.signedIn = true;
    const signedInMarkup = renderShell();

    expect(signedOutMarkup).toContain('<header');
    expect(signedOutMarkup).toContain('<main');
    expect(signedInMarkup).toContain('<header');
    expect(signedInMarkup).toContain('<main');
    expect(signedInMarkup).not.toContain('Save useful work once. Improve it together.');
  });

  it('reserves the signed-out actions without adding transient header copy', () => {
    shellState.signedIn = false;
    shellState.authSurfaceState = 'loading';
    const markup = renderShell();

    expect(markup).toContain('Create workspace');
    expect(markup).not.toContain('Checking sign-in');
  });

  it('uses Next links for the simple contributor navigation without legacy commands', () => {
    const markup = renderShell();

    expect(markup.match(/data-next-link="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/library"');
    expect(markup).toContain('href="/my-work"');
    expect(markup).not.toContain('Approvals');
    expect(markup).not.toContain('Workspace Admin');
    expect(markup).not.toContain('Advanced');
    expect(markup).not.toContain('Agent catalog');
    expect(markup).not.toContain('Execution history');
    expect(markup).not.toContain('Command palette');
  });

  it('adds review and Library settings navigation for curators', () => {
    shellState.role = 'curator';
    const markup = renderShell();

    expect(markup).toContain('Approvals');
    expect(markup).toContain('Library settings');
    expect(markup).toContain('href="/workspace-admin"');
    expect(markup).not.toContain('Workspace Admin');
    expect(markup).not.toContain('Advanced');
  });

  it('shows workspace administration without legacy Advanced by default', () => {
    for (const role of ['owner', 'admin'] as const) {
      shellState.role = role;
      const markup = renderShell();

      expect(markup).toContain('Approvals');
      expect(markup).toContain('Workspace Admin');
      expect(markup).not.toContain('Advanced');
    }
  });

  it('shows Advanced to owners and admins only when the legacy alpha flag is enabled', () => {
    process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED = 'true';
    shellState.role = 'owner';

    expect(renderShell()).toContain('Advanced');
  });

  it('offers feedback once instead of competing calls to action', () => {
    const markup = renderShell();

    expect(markup.match(/>Share feedback</g)?.length ?? 0).toBe(1);
    expect(markup).toMatch(/class="hidden [^"]* sm:inline-flex/);
    expect(markup).not.toContain('Share beta feedback');
  });

  it('does not require Clerk Organizations in the default personal workspace', () => {
    const markup = renderShell();

    expect(markup).toContain('Example workspace');
    expect(markup).not.toContain('Workspace switcher');
  });
});
