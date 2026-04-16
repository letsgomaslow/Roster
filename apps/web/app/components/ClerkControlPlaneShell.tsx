'use client';

import { useAuth } from '@clerk/nextjs';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import { ControlPlaneShell } from './control-plane/ControlPlaneShell';

export function ClerkControlPlaneShell({
  children,
  authSurfaceState,
}: {
  children: React.ReactNode;
  authSurfaceState: AuthSurfaceState;
}) {
  const { isSignedIn } = useAuth();

  return (
    <ControlPlaneShell authSurfaceState={authSurfaceState} signedIn={Boolean(isSignedIn)}>
      {children}
    </ControlPlaneShell>
  );
}
