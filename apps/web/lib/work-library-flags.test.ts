import { describe, expect, it } from 'vitest';
import { isWorkLibraryEnabled } from './work-library-flags';

describe('isWorkLibraryEnabled', () => {
  it('launches enabled by default but supports an explicit rollback', () => {
    expect(isWorkLibraryEnabled(undefined)).toBe(true);
    expect(isWorkLibraryEnabled('true')).toBe(true);
    expect(isWorkLibraryEnabled('false')).toBe(false);
  });
});
