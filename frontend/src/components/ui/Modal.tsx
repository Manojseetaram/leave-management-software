"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/src/utils/format";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Always call the latest onClose without re-running the focus effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    const prev = document.activeElement as HTMLElement | null;

    // Only move focus to the dialog if nothing inside it (e.g. an autoFocus input) already has it
    if (ref.current && !ref.current.contains(document.activeElement)) {
      ref.current.focus();
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl focus:outline-none",
          className,
        )}
      >
        {title && (
          <h2 id="modal-title" className="mb-4 text-lg font-semibold text-foreground">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;