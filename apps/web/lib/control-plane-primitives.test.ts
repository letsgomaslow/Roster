import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ActionButton,
  Badge,
  SkeletonCardGrid,
  SkeletonList,
  SurfaceNotice,
} from '@/app/components/control-plane/primitives';

describe('passive labels and actions', () => {
  it('renders passive labels as capsules without making actions pill-shaped', () => {
    const badgeHtml = renderToStaticMarkup(
      createElement(Badge, { tone: 'strategy' }, 'Approved'),
    );
    const actionHtml = renderToStaticMarkup(
      createElement(ActionButton, null, 'Open work'),
    );

    expect(badgeHtml).toContain('<span');
    expect(badgeHtml).toContain('rounded-[var(--maslow-radius-capsule)]');
    expect(actionHtml).toContain('<button');
    expect(actionHtml).not.toContain('rounded-[var(--maslow-radius-capsule)]');
  });
});

describe('calm loading primitives', () => {
  it('announces a list load without animated placeholders', () => {
    const html = renderToStaticMarkup(createElement(SkeletonList, { rows: 2 }));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading items"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('animate-pulse');
  });

  it('keeps card loading geometry static and hidden from assistive technology', () => {
    const html = renderToStaticMarkup(createElement(SkeletonCardGrid, { count: 2 }));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading library cards"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('animate-pulse');
  });
});

describe('SurfaceNotice announcements', () => {
  it('announces errors immediately', () => {
    const html = renderToStaticMarkup(
      createElement(SurfaceNotice, {
        description: 'The workspace could not be opened.',
        title: 'Workspace error',
        tone: 'error',
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).not.toContain('role="status"');
  });

  it.each(['info', 'success'] as const)(
    'uses a polite status for a live %s update',
    (tone) => {
      const html = renderToStaticMarkup(
        createElement(SurfaceNotice, {
          description: 'The latest operation finished.',
          live: true,
          title: 'Updated',
          tone,
        }),
      );

      expect(html).toContain('role="status"');
      expect(html).not.toContain('role="alert"');
    },
  );

  it('does not announce static information on initial render', () => {
    const html = renderToStaticMarkup(
      createElement(SurfaceNotice, {
        description: 'Private drafts stay private until shared.',
        title: 'You stay in control',
        tone: 'info',
      }),
    );

    expect(html).not.toMatch(/role="(?:status|alert)"/);
  });
});
