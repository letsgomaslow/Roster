'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConvexProviderWithAuth } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ClerkWorkspaceBootstrap } from '@/app/components/work-library/WorkspaceContext';
import { convex } from '@/lib/convex-client';

const anonymousAuthState = {
  isLoading: false,
  isAuthenticated: false,
  fetchAccessToken: async () => null,
};

function useAnonymousConvexAuth() {
  return anonymousAuthState;
}

function SignedInWorkspaceBoundary({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return children;
  return <ClerkWorkspaceBootstrap>{children}</ClerkWorkspaceBootstrap>;
}

export function AppProviders({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) {
  if (clerkEnabled) {
    return (
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SignedInWorkspaceBoundary>{children}</SignedInWorkspaceBoundary>
      </ConvexProviderWithClerk>
    );
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAnonymousConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
