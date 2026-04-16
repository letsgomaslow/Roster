'use client';

import { useAuth } from '@clerk/nextjs';
import { HomeScreen } from './HomeScreen';
import { PublicBetaHomeScreen } from './PublicBetaHomeScreen';

export function ClerkAwareHomeScreen() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <HomeScreen /> : <PublicBetaHomeScreen authSurfaceState="ready" />;
}
