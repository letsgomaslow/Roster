import type { Metadata } from 'next';

import { ClerkAwareHomeScreen } from './components/screens/ClerkAwareHomeScreen';
import { PublicBetaHomeScreen } from './components/screens/PublicBetaHomeScreen';

export const metadata: Metadata = {
  title: 'Home',
};

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export default function Home() {
  return clerkEnabled ? (
    <ClerkAwareHomeScreen />
  ) : (
    <PublicBetaHomeScreen authSurfaceState="disabled" />
  );
}
