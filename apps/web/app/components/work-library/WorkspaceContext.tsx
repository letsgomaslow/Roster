'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { WorkspaceRole } from '@/lib/work-library-navigation';
import {
  friendlyWorkspaceBootstrapError,
  resolveWorkspaceBootstrapTarget,
  startWorkspaceHandoffTimer,
} from '@/lib/workspace-bootstrap';

type WorkspaceState = {
  status: 'idle' | 'bootstrapping' | 'ready' | 'error';
  workspaceId?: string;
  name?: string;
  role?: WorkspaceRole;
  error?: string;
  scopeKey?: string;
  retry?: () => void;
};

const WorkspaceContext = createContext<WorkspaceState>({ status: 'idle' });

function WorkspaceBootstrapRun({
  children,
  clerkLoaded,
  signedIn,
  organizationId,
  authorizationKey,
}: {
  children: ReactNode;
  clerkLoaded: boolean;
  signedIn: boolean;
  organizationId?: string;
  authorizationKey?: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const bootstrap = useMutation(api.workLibrary.bootstrapWorkspace);
  const [state, setState] = useState<WorkspaceState>({ status: 'bootstrapping' });
  const [timedOutHandoffKey, setTimedOutHandoffKey] = useState<string>();
  const target = resolveWorkspaceBootstrapTarget({
    clerkLoaded,
    signedIn,
    convexAuthenticated: isAuthenticated,
    organizationId,
    authorizationKey,
  });
  const readyScopeKey = target.phase === 'ready' ? target.scopeKey : undefined;
  const handoffKey =
    target.phase === 'waiting_for_convex'
      ? `${organizationId ?? 'personal'}:${authorizationKey ?? 'pending-session'}`
      : undefined;

  useEffect(() => {
    if (!handoffKey) return;
    return startWorkspaceHandoffTimer(() => setTimedOutHandoffKey(handoffKey));
  }, [handoffKey]);

  useEffect(() => {
    if (!readyScopeKey) return;
    let active = true;
    void bootstrap({})
      .then((workspace) => {
        if (!active) return;
        setState({
          status: 'ready',
          workspaceId: workspace.workspaceId,
          name: workspace.name,
          role: workspace.role,
          scopeKey: readyScopeKey,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          error: friendlyWorkspaceBootstrapError(error),
          scopeKey: readyScopeKey,
        });
      });
    return () => {
      active = false;
    };
  }, [bootstrap, readyScopeKey]);

  let visibleState: WorkspaceState = state;
  if (target.phase === 'signed_out') {
    visibleState = { status: 'idle' };
  } else if (handoffKey && timedOutHandoffKey === handoffKey) {
    visibleState = {
      status: 'error',
      error:
        'Roster could not finish the secure workspace connection. Reload the page to try again.',
      retry: () => window.location.reload(),
    };
  } else if (!readyScopeKey || state.scopeKey !== readyScopeKey) {
    visibleState = { status: 'bootstrapping' };
  }

  return <WorkspaceContext.Provider value={visibleState}>{children}</WorkspaceContext.Provider>;
}

export function ClerkWorkspaceBootstrap({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, orgId, orgRole, sessionId } = useAuth();
  const authorizationKey = isSignedIn
    ? `${sessionId ?? 'session'}:${orgRole ?? 'personal'}`
    : undefined;
  return (
    <WorkspaceBootstrapRun
      authorizationKey={authorizationKey}
      clerkLoaded={isLoaded}
      organizationId={orgId ?? undefined}
      signedIn={Boolean(isSignedIn)}
    >
      {children}
    </WorkspaceBootstrapRun>
  );
}

export function useWorkspace(): WorkspaceState {
  return useContext(WorkspaceContext);
}
