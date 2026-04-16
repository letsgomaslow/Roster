import type { Metadata } from 'next';
import { ClerkAwareGettingStartedScreen } from '@/app/components/screens/ClerkAwareGettingStartedScreen';
import { GettingStartedScreen } from '@/app/components/screens/GettingStartedScreen';

export const metadata: Metadata = {
  title: 'Getting Started',
};

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export default function GettingStartedPage() {
  return clerkEnabled ? (
    <ClerkAwareGettingStartedScreen />
  ) : (
    <GettingStartedScreen authSurfaceState="disabled" signedIn={false} />
  );
}
