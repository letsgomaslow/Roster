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
    expect(getWorkLibraryNavigation('viewer').find((item) => item.label === 'Library')).toEqual({
      caption: 'AI work and playbooks',
      href: '/library',
      label: 'Library',
    });
  });

  it('adds Approvals and calm Library settings for curators', () => {
    expect(getWorkLibraryNavigation('curator').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
      'Approvals',
      'Library settings',
    ]);
    expect(getWorkLibraryNavigation('curator').at(-1)).toEqual({
      caption: 'Teams and work types',
      href: '/workspace-admin',
      label: 'Library settings',
    });
  });

  it('keeps administration visible while legacy Advanced stays hidden by default', () => {
    expect(getWorkLibraryNavigation('admin').map((item) => item.label)).toEqual([
      'Home',
      'Library',
      'My Work',
      'Approvals',
      'Workspace Admin',
    ]);
  });

  it('reveals Advanced only when the legacy alpha flag is explicitly enabled', () => {
    expect(getWorkLibraryNavigation('admin', true, true).map((item) => item.label)).toContain(
      'Advanced',
    );
    expect(getWorkLibraryNavigation('owner', true, true).map((item) => item.label)).toContain(
      'Advanced',
    );
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
