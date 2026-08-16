import { useEffect, useRef } from 'react';

/**
 * F9 — dependency-free focus trap for modal dialogs.
 *
 * Attach the returned ref to the dialog element and pass `open` = the modal's
 * open state. While open, the hook:
 *
 *   1. Moves focus into the dialog on open (`initialFocus` ?? first focusable
 *      element ?? the dialog itself).
 *   2. Traps Tab / Shift+Tab inside the dialog (wraps at both ends).
 *   3. Handles Escape via `onEscape` and STOPS PROPAGATION on the capture
 *      phase, so lower layers — e.g. the BakaSur rail's own Escape-to-close —
 *      never react while a modal is open (one coherent Escape policy:
 *      the top modal wins).
 *   4. Restores focus to the previously-focused element (the opener) on close.
 *
 * No dependencies, no inert polyfill — restoration + trap is enough for this
 * app's modal layer (three dialogs, never stacked).
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  options: { onEscape?: () => void; initialFocus?: () => HTMLElement | null } = {},
) {
  const dialogRef = useRef<T | null>(null);

  // Latest-callback refs: the effect below only re-runs on open/close, so the
  // caller can pass fresh closures every render without re-trapping.
  const onEscapeRef = useRef(options.onEscape);
  const initialFocusRef = useRef(options.initialFocus);

  // Latest-callback refs: updated after every render (never during render —
  // react-hooks/refs), so callers can pass fresh closures each render without
  // re-trapping; the keydown handler reads them at event time.
  useEffect(() => {
    onEscapeRef.current = options.onEscape;
    initialFocusRef.current = options.initialFocus;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]',
          ].join(', '),
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Initial focus: requested element, else first focusable, else the dialog.
    const initial = initialFocusRef.current?.() ?? getFocusables()[0] ?? dialog;
    initial.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Capture phase + stopPropagation: nothing below the modal layer ever
        // sees Escape while a dialog is open (rail Esc stays for when it isn't).
        event.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus();
    };
  }, [open]);

  return dialogRef;
}
