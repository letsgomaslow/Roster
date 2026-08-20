import { describe, expect, it } from 'vitest';
import { getWorkLibraryNavigation } from './work-library-navigation';

describe('getWorkLibraryNavigation', () => {
  it('keeps the default navigation focused for contributors and viewers', () => {
    expect(getWorkLibraryNavigation('contributor').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
    ]);
    expect(getWorkLibraryNavigation('viewer').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
    ]);
  });

  it('adds Approvals for curators without exposing workspace administration', () => {
    expect(getWorkLibraryNavigation('curator').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
      'Approvals',
    ]);
  });

  it('keeps administration and technical surfaces role-gated', () => {
    expect(getWorkLibraryNavigation('admin').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
      'Approvals',
      'Workspace Admin',
      'Advanced',
    ]);
  });

  it('can restore the preserved control-plane navigation with one feature flag', () => {
    expect(getWorkLibraryNavigation('admin', false).map((item) => item.label)).toEqual([
      'Home',
      'Prompt Library',
      'Agents',
      'Runs',
      'Integrations',
      'Settings',
    ]);
  });
});
