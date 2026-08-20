'use client';

import { usePathname } from 'next/navigation';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import { GettingStartedScreen } from './screens/GettingStartedScreen';
import { PublicBetaHomeScreen } from './screens/PublicBetaHomeScreen';
import { RouteStatusScreen } from './screens/RouteStatusScreen';
import { WorkspaceLoadingScreen } from './screens/WorkspaceLoadingScreen';

export function ClerkBootstrapFallback({
  authSurfaceState,
  diagnostic,
}: {
  authSurfaceState: Extract<AuthSurfaceState, 'loading' | 'failed'>;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  const pathname = usePathname();

  if (authSurfaceState === 'loading') {
    return <WorkspaceLoadingScreen pathname={pathname} />;
  }

  if (pathname === '/getting-started') {
    return (
      <GettingStartedScreen
        authSurfaceState={authSurfaceState}
        diagnostic={diagnostic}
        signedIn={false}
      />
    );
  }

  if (pathname !== '/') {
    return (
      <RouteStatusScreen
        authSurfaceState={authSurfaceState}
        diagnostic={diagnostic}
        mode="failed"
        pathname={pathname}
      />
    );
  }

  return <PublicBetaHomeScreen authSurfaceState={authSurfaceState} diagnostic={diagnostic} />;
}
