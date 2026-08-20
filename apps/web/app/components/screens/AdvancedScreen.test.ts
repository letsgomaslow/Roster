import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({ role: 'owner', status: 'ready' }),
}));

import { AdvancedScreen } from './AdvancedScreen';

describe('AdvancedScreen', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LEGACY_ADVANCED_ENABLED;
  });

  it('shows a calm unavailable notice by default instead of mounting legacy tools', () => {
    const markup = renderToStaticMarkup(createElement(AdvancedScreen));

    expect(markup).toContain('Legacy Advanced tools are unavailable');
    expect(markup).toContain('The Setup Center remains available');
    expect(markup).not.toContain('Open the technical layer when you need it');
  });
});
