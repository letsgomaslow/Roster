type LegacyAdvancedRuntimeInput = {
  enabledValue?: string;
  environment?: string;
  hasClerkKeys: boolean;
  insecureLocalValue?: string;
  userId?: string;
  orgId?: string;
  orgRole?: string;
};

type LegacyAdvancedRuntimeAccess =
  | { allowed: true }
  | { allowed: false; status: 401 | 403 | 404; error: string };

function isExplicitlyEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function isLegacyAdvancedRuntimeEnabled(value?: string): boolean {
  return isExplicitlyEnabled(value);
}

export function getLegacyAdvancedRuntimeAccess(
  input: LegacyAdvancedRuntimeInput,
): LegacyAdvancedRuntimeAccess {
  if (!isLegacyAdvancedRuntimeEnabled(input.enabledValue)) {
    return { allowed: false, status: 404, error: 'Legacy Advanced tools are not enabled' };
  }
  if (!input.hasClerkKeys) {
    const localOnly = input.environment !== 'production' && isExplicitlyEnabled(input.insecureLocalValue);
    return localOnly
      ? { allowed: true }
      : {
          allowed: false,
          status: 403,
          error: 'Legacy Advanced tools require verified authentication',
        };
  }
  if (!input.userId) return { allowed: false, status: 401, error: 'Unauthorized' };
  if (!input.orgId || input.orgRole === 'org:admin' || input.orgRole === 'org:owner') {
    return { allowed: true };
  }
  return {
    allowed: false,
    status: 403,
    error: 'Advanced access requires a workspace owner or admin',
  };
}
