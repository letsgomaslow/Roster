'use client';

import { RefObject, type MutableRefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function findFocusable(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true',
  );
}

type UseDialogA11yOptions<
  ContainerEl extends HTMLElement = HTMLElement,
  InitialFocusEl extends HTMLElement = HTMLElement,
  ReturnFocusEl extends HTMLElement = HTMLElement,
> = {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<ContainerEl | null>;
  initialFocusRef?: RefObject<InitialFocusEl | null>;
  returnFocusRef?: MutableRefObject<ReturnFocusEl | null>;
};

export function useDialogA11y({
  open,
  onClose,
  containerRef,
  initialFocusRef,
  returnFocusRef,
}: UseDialogA11yOptions) {
  const fallbackReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const activeBeforeOpen = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    if (returnFocusRef) {
      if (!returnFocusRef.current) {
        returnFocusRef.current = activeBeforeOpen;
      }
    } else {
      fallbackReturnFocusRef.current = activeBeforeOpen;
    }

    const container = containerRef.current;
    const preferredFocus = initialFocusRef?.current;
    const [firstFocusable] = findFocusable(container);
    (preferredFocus ?? firstFocusable ?? container)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = findFocusable(containerRef.current);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || currentIndex === -1)) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown, true);
      const returnTarget = returnFocusRef?.current ?? fallbackReturnFocusRef.current;
      returnTarget?.focus();
      if (returnFocusRef) {
        returnFocusRef.current = null;
      }
      fallbackReturnFocusRef.current = null;
    };
  }, [containerRef, initialFocusRef, onClose, open, returnFocusRef]);
}
