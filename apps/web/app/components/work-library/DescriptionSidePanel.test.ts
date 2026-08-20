import { createElement, createRef, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DescriptionSidePanel } from './DescriptionSidePanel';

function renderPanel({
  children = createElement('p', null, 'A complete description.'),
  open = true,
}: {
  children?: ReactNode;
  open?: boolean;
} = {}) {
  return renderToStaticMarkup(
    createElement(
      DescriptionSidePanel,
      {
        onClose: vi.fn(),
        open,
        returnFocusRef: createRef<HTMLElement>(),
        title: 'Proposal drafter',
      },
      children,
    ),
  );
}

describe('DescriptionSidePanel', () => {
  it('keeps formatted content mounted but hidden from sight and assistive technology while closed', () => {
    const html = renderPanel({ open: false });

    expect(html).toContain('A complete description.');
    expect(html.match(/hidden=""/g)).toHaveLength(2);
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it('exposes a labelled modal without announcing the full description as live status', () => {
    const html = renderPanel();
    const headingId = html.match(/<h2[^>]*id="([^"]+)"/)?.[1];

    expect(headingId).toBeTruthy();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(`aria-labelledby="${headingId}"`);
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Proposal drafter');
    expect(html).toContain('A complete description.');
    expect(html).not.toContain('aria-live');
    expect(html).not.toContain('aria-describedby');
  });

  it('keeps dismissal visible while the description scrolls independently', () => {
    const html = renderPanel();

    expect(html).toMatch(/<header class="[^"]*sticky[^"]*min-h-11[^"]*"/);
    expect(html).toMatch(/<button[^>]*>Close<\/button>/);
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('overscroll-contain');
    expect(html).toContain('[overflow-wrap:anywhere]');
  });

  it('uses a square full-viewport mobile shell and bounded desktop side sheet', () => {
    const html = renderPanel();

    expect(html).toContain('fixed inset-0');
    expect(html).toContain('sm:w-[min(92vw,34rem)]');
    expect(html).toContain('env(safe-area-inset-top)');
    expect(html).toContain('env(safe-area-inset-bottom)');
    expect(html).not.toMatch(/rounded(?:-|\b)/);
  });
});
