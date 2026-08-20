import { describe, expect, it } from 'vitest';
import {
  getLegacyAdvancedRuntimeAccess,
  isLegacyAdvancedRuntimeEnabled,
} from './legacy-advanced-access';

describe('legacy Advanced runtime access', () => {
  it('keeps host-filesystem orchestration disabled unless explicitly enabled', () => {
    expect(isLegacyAdvancedRuntimeEnabled(undefined)).toBe(false);
    expect(isLegacyAdvancedRuntimeEnabled('false')).toBe(false);
    expect(isLegacyAdvancedRuntimeEnabled('true')).toBe(true);
  });

  it('allows only personal owners or verified organization admins after authentication', () => {
    const base = { enabledValue: 'true', environment: 'production', hasClerkKeys: true };

    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        userId: 'user_personal',
        orgId: undefined,
        orgRole: undefined,
      }),
    ).toEqual({ allowed: true });
    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        userId: 'user_admin',
        orgId: 'org_1',
        orgRole: 'org:admin',
      }),
    ).toEqual({ allowed: true });
    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        userId: 'user_contributor',
        orgId: 'org_1',
        orgRole: 'org:contributor',
      }),
    ).toMatchObject({ allowed: false, status: 403 });
    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        userId: undefined,
        orgId: undefined,
        orgRole: undefined,
      }),
    ).toMatchObject({ allowed: false, status: 401 });
  });

  it('fails closed without Clerk unless insecure local access is separately opted in', () => {
    const base = {
      enabledValue: 'true',
      hasClerkKeys: false,
      userId: undefined,
      orgId: undefined,
      orgRole: undefined,
    };

    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        environment: 'production',
        insecureLocalValue: 'true',
      }),
    ).toMatchObject({ allowed: false, status: 403 });
    expect(
      getLegacyAdvancedRuntimeAccess({
        ...base,
        environment: 'development',
        insecureLocalValue: 'true',
      }),
    ).toEqual({ allowed: true });
  });
});
