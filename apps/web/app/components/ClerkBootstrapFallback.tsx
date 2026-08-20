'use client';

import { usePathname } from 'next/navigation';
import type { ClerkEnvironmentDiagnostic } from '@/lib/clerk-diagnostics';
import type { AuthSurfaceState } from '@/lib/auth-surface';
import { GettingStartedScreen } from './screens/GettingStartedScreen';
import { PublicBetaHomeScreen } from './screens/PublicBetaHomeScreen';
import { RouteStatusScreen } from './screens/RouteStatusScreen';

export function ClerkBootstrapFallback({
  authSurfaceState,
  diagnostic,
}: {
  authSurfaceState: Extract<AuthSurfaceState, 'loading' | 'failed'>;
  diagnostic?: ClerkEnvironmentDiagnostic | null;
}) {
  const pathname = usePathname();

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
        mode={authSurfaceState === 'loading' ? 'signed_out' : 'failed'}
        pathname={pathname}
      />
    );
  }

  return <PublicBetaHomeScreen authSurfaceState={authSurfaceState} diagnostic={diagnostic} />;
}
