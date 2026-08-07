"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./Icons";

/**
 * Umumiy modal oyna.
 *
 * Qulaylik (accessibility):
 *  - Ochilganda fokus modal ichiga o'tadi, yopilganda avvalgi elementga qaytadi
 *  - Tab bilan fokus modaldan chiqib ketmaydi (focus trap)
 *  - Escape va fon bosilganda yopiladi
 *  - role="dialog" + aria-modal + aria-labelledby
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children, footer }) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable || dialog)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const items = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Oynani yopish">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
