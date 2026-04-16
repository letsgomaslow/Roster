'use client';

import {
  ClerkDegraded,
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
} from '@clerk/nextjs';
import type { ReactNode } from 'react';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import { AppProviders } from './AppProviders';
import { ClerkBootstrapFallback } from './ClerkBootstrapFallback';
import { ClerkControlPlaneShell } from './ClerkControlPlaneShell';
import { ControlPlaneShell } from './control-plane/ControlPlaneShell';

export function ClerkBootstrapBoundary({
  children,
  diagnostic,
}: {
  children: ReactNode;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  return (
    <>
      <ClerkLoading>
        <AppProviders clerkEnabled={false}>
          <ControlPlaneShell authSurfaceState="loading" signedIn={false}>
            <ClerkBootstrapFallback authSurfaceState="loading" diagnostic={diagnostic} />
          </ControlPlaneShell>
        </AppProviders>
      </ClerkLoading>

      <ClerkFailed>
        <AppProviders clerkEnabled={false}>
          <ControlPlaneShell authSurfaceState="failed" signedIn={false}>
            <ClerkBootstrapFallback authSurfaceState="failed" diagnostic={diagnostic} />
          </ControlPlaneShell>
        </AppProviders>
      </ClerkFailed>

      <ClerkDegraded>
        <AppProviders clerkEnabled={false}>
          <ControlPlaneShell authSurfaceState="failed" signedIn={false}>
            <ClerkBootstrapFallback authSurfaceState="failed" diagnostic={diagnostic} />
          </ControlPlaneShell>
        </AppProviders>
      </ClerkDegraded>

      <ClerkLoaded>
        <AppProviders clerkEnabled>
          <ClerkControlPlaneShell authSurfaceState="ready">{children}</ClerkControlPlaneShell>
        </AppProviders>
      </ClerkLoaded>
    </>
  );
}
