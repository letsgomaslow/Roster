'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { useConvexAuth, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { WorkspaceRole } from '@/lib/work-library-navigation';

type WorkspaceState = {
  status: 'idle' | 'bootstrapping' | 'ready' | 'error';
  workspaceId?: string;
  name?: string;
  role?: WorkspaceRole;
  error?: string;
};

const WorkspaceContext = createContext<WorkspaceState>({ status: 'idle' });

function WorkspaceBootstrapRun({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const bootstrap = useMutation(api.workLibrary.bootstrapWorkspace);
  const [state, setState] = useState<WorkspaceState>({
    status: isAuthenticated ? 'bootstrapping' : 'idle',
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    void bootstrap({})
      .then((workspace) => {
        if (!active) return;
        setState({
          status: 'ready',
          workspaceId: workspace.workspaceId,
          name: workspace.name,
          role: workspace.role,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Workspace setup failed',
        });
      });
    return () => {
      active = false;
    };
  }, [bootstrap, isAuthenticated]);

  const value = useMemo(() => state, [state]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function ClerkWorkspaceBootstrap({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  return (
    <WorkspaceBootstrapRun key={organization?.id ?? 'personal'}>{children}</WorkspaceBootstrapRun>
  );
}

export function useWorkspace(): WorkspaceState {
  return useContext(WorkspaceContext);
}
