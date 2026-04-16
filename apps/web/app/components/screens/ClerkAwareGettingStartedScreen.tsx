'use client';

import { useAuth } from '@clerk/nextjs';
import { GettingStartedScreen } from './GettingStartedScreen';

export function ClerkAwareGettingStartedScreen() {
  const { isSignedIn } = useAuth();
  return <GettingStartedScreen authSurfaceState="ready" signedIn={Boolean(isSignedIn)} />;
}
