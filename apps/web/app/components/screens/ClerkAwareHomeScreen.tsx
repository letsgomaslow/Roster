'use client';

import { useAuth } from '@clerk/nextjs';
import { PublicBetaHomeScreen } from './PublicBetaHomeScreen';
import { WorkLibraryHomeScreen } from './WorkLibraryHomeScreen';
import { HomeScreen } from './HomeScreen';
import { isWorkLibraryEnabled } from '@/lib/work-library-flags';

export function ClerkAwareHomeScreen() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return <PublicBetaHomeScreen authSurfaceState="ready" />;
  return isWorkLibraryEnabled(process.env.NEXT_PUBLIC_WORK_LIBRARY_ENABLED) ? (
    <WorkLibraryHomeScreen />
  ) : (
    <HomeScreen />
  );
}
