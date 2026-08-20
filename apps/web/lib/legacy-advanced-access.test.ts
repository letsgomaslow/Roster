import { describe, expect, it } from 'vitest';
import {
  getLegacyAdvancedRouteAccess,
  isLegacyAdvancedEnabled,
} from './legacy-advanced-access';

describe('legacy Advanced access', () => {
  it('keeps legacy Advanced disabled unless the flag is explicitly true', () => {
    expect(isLegacyAdvancedEnabled()).toBe(false);
    expect(isLegacyAdvancedEnabled('false')).toBe(false);
    expect(isLegacyAdvancedEnabled('1')).toBe(false);
    expect(isLegacyAdvancedEnabled(' true ')).toBe(true);
  });

  it('keeps every legacy route unavailable while the alpha flag is off', () => {
    expect(
      getLegacyAdvancedRouteAccess(
        { userId: 'user_1', orgId: null, orgRole: null },
        undefined,
      ),
    ).toEqual({ allowed: false, status: 404, error: 'Legacy Advanced tools are not enabled' });
  });

  it('requires sign-in after legacy Advanced is explicitly enabled', () => {
    expect(getLegacyAdvancedRouteAccess({ userId: null, orgId: null, orgRole: null }, 'true')).toEqual({
      allowed: false,
      status: 401,
      error: 'Unauthorized',
    });
  });

  it.each(['org:admin', 'org:owner'])('allows the verified %s organization role', (orgRole) => {
    expect(
      getLegacyAdvancedRouteAccess({ userId: 'user_1', orgId: 'org_1', orgRole }, 'true'),
    ).toEqual({ allowed: true });
  });

  it('allows an authenticated personal workspace', () => {
    expect(
      getLegacyAdvancedRouteAccess(
        { userId: 'personal_owner', orgId: null, orgRole: null },
        'true',
      ),
    ).toEqual({ allowed: true });
  });

  it.each(['org:curator', 'org:contributor', 'org:viewer', null])(
    'denies a non-manager organization role (%s)',
    (orgRole) => {
      expect(
        getLegacyAdvancedRouteAccess({ userId: 'user_1', orgId: 'org_1', orgRole }, 'true'),
      ).toEqual({
        allowed: false,
        status: 403,
        error: 'Advanced access requires a workspace owner or admin',
      });
    },
  );
});
