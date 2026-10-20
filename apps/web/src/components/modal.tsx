'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Dialog over a blurred page. Closes on Esc or a click outside; locks page scroll while open. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <div className="absolute inset-0 animate-[fade-in_200ms_ease-out] bg-ink/25 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-lift outline-none sm:p-7"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-serif text-2xl font-medium leading-tight">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-full p-2 text-muted transition hover:bg-soft hover:text-ink" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
