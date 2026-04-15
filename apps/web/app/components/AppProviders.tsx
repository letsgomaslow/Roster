'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConvexProviderWithAuth } from 'convex/react';
import { convex } from '@/lib/convex-client';

function useClerkBackedConvexAuth() {
  const { isLoaded, isSignedIn, getToken, sessionClaims } = useAuth();
  const template = process.env.NEXT_PUBLIC_CLERK_CONVEX_JWT_TEMPLATE?.trim();
  const hasNativeConvexAudience = sessionClaims?.aud === 'convex';

  return {
    isLoading: !isLoaded,
    isAuthenticated: Boolean(isSignedIn && (hasNativeConvexAudience || template)),
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        if (hasNativeConvexAudience) {
          return await getToken({ skipCache: forceRefreshToken });
        }
        if (!template) {
          return null;
        }
        return await getToken({ template, skipCache: forceRefreshToken });
      } catch {
        return null;
      }
    },
  };
}

function useAnonymousConvexAuth() {
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

export function AppProviders({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) {
  const useAuthHook = clerkEnabled ? useClerkBackedConvexAuth : useAnonymousConvexAuth;

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthHook}>
      {children}
    </ConvexProviderWithAuth>
  );
}
