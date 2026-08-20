'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useDialogA11y } from '../control-plane/useDialogA11y';

export function DescriptionSidePanel({
  children,
  onClose,
  open,
  returnFocusRef,
  title,
}: {
  children?: ReactNode;
  onClose: () => void;
  open: boolean;
  returnFocusRef?: MutableRefObject<HTMLElement | null>;
  title: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useDialogA11y({
    open,
    onClose: handleClose,
    containerRef: panelRef,
    initialFocusRef: headingRef,
    returnFocusRef,
  });

  return (
    <>
      <button
        aria-hidden="true"
        aria-label="Close description panel"
        className="fixed inset-0 z-40 cursor-default bg-black/35"
        hidden={!open}
        onClick={handleClose}
        tabIndex={-1}
        type="button"
      />
      <aside
        aria-hidden={open ? undefined : true}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`fixed inset-0 z-50 h-dvh w-full flex-col overflow-hidden border-l border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-panel-strong)] sm:inset-y-3 sm:left-auto sm:right-3 sm:h-auto sm:w-[min(92vw,34rem)] ${open ? 'flex' : 'hidden'}`}
        hidden={!open}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <header className="sticky top-0 z-10 flex min-h-11 shrink-0 items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel)] px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
          <h2
            className="min-w-0 font-heading text-2xl tracking-[-0.04em] text-[var(--ink)] [overflow-wrap:anywhere]"
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
          >
            {title}
          </h2>
          <button
            aria-label="Close description panel"
            className="min-h-11 min-w-11 shrink-0 border border-[var(--line-strong)] bg-[var(--panel)] px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]"
            onClick={handleClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 text-[var(--ink-soft)] [overflow-wrap:anywhere] sm:pb-5">
          {children}
        </div>
      </aside>
    </>
  );
}
