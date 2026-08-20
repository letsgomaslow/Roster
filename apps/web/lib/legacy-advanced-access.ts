type LegacyAdvancedSession = {
  userId: string | null | undefined;
  orgId: string | null | undefined;
  orgRole: string | null | undefined;
};

type LegacyAdvancedRouteAccess =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 404; error: string };

export function isLegacyAdvancedEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function getLegacyAdvancedRouteAccess(
  session: LegacyAdvancedSession,
  enabledValue?: string,
): LegacyAdvancedRouteAccess {
  if (!isLegacyAdvancedEnabled(enabledValue)) {
    return { allowed: false, status: 404, error: 'Legacy Advanced tools are not enabled' };
  }
  if (!session.userId) return { allowed: false, status: 401, error: 'Unauthorized' };
  if (!session.orgId || session.orgRole === 'org:admin' || session.orgRole === 'org:owner') {
    return { allowed: true };
  }
  return {
    allowed: false,
    status: 403,
    error: 'Advanced access requires a workspace owner or admin',
  };
}
