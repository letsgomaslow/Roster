'use client';

import { useAuth, useClerk, useOrganization, useUser } from '@clerk/nextjs';
import { isClerkOrganizationsEnabled } from '@/lib/clerk-organizations';
import { GettingStartedScreen } from './GettingStartedScreen';

function OrganizationAwareGettingStarted({
  displayName,
  signedIn,
}: {
  displayName?: string;
  signedIn: boolean;
}) {
  const { openInviteMembers } = useClerk();
  const { organization } = useOrganization();
  const hasTeammates = Boolean(
    organization &&
      (organization.membersCount > 1 || organization.pendingInvitationsCount > 0),
  );

  return (
    <GettingStartedScreen
      authSurfaceState="ready"
      displayName={displayName}
      hasTeammates={hasTeammates}
      onInvite={organization ? () => openInviteMembers() : undefined}
      organizationName={organization?.name}
      signedIn={signedIn}
    />
  );
}

export function ClerkAwareGettingStartedScreen() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.fullName ?? undefined;
  const signedIn = Boolean(isSignedIn);
  const organizationsEnabled = isClerkOrganizationsEnabled(
    process.env.NEXT_PUBLIC_CLERK_ORGANIZATIONS_ENABLED,
  );

  if (organizationsEnabled) {
    return (
      <OrganizationAwareGettingStarted displayName={displayName} signedIn={signedIn} />
    );
  }

  return (
    <GettingStartedScreen
      authSurfaceState="ready"
      displayName={displayName}
      signedIn={signedIn}
    />
  );
}
