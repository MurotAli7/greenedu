"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "./Icons";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children, footer }) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  // Har renderda eng yangi onClose funksiyasini saqlab turamiz.
  onCloseRef.current = onClose;

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;

    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector(FOCUSABLE_SELECTOR);

    (firstFocusable || dialog)?.focus();

    const handleKeyDown = (event) => {
      // ESC bosilganda modalni yopish
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      // Faqat TAB tugmasini nazorat qilamiz
      if (event.key !== "Tab" || !dialog) return;

      const items = Array.from(
        dialog.querySelectorAll(FOCUSABLE_SELECTOR)
      ).filter((element) => element.offsetParent !== null);

      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      // Shift + Tab
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      // Oddiy Tab
      else if (!event.shiftKey && document.activeElement === last) {
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

      // Modal yopilganda oldingi elementga fokusni qaytarish
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onClick={(event) =>
        event.target === event.currentTarget &&
        onCloseRef.current()
      }
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

          <button
            type="button"
            className="iconbtn"
            onClick={() => onCloseRef.current()}
            aria-label="Oynani yopish"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}