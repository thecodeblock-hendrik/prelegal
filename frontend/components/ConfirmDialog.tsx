"use client";

import { useEffect, useId, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation for destructive actions on a native dialog; Cancel has focus, Esc and backdrop clicks cancel. */
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => event.target === event.currentTarget && onCancel()}
    >
      <div className="space-y-2 p-6">
        <h2 id={`${id}-title`} className="text-heading font-semibold text-primary">
          {title}
        </h2>
        <p id={`${id}-message`} className="text-muted">
          {message}
        </p>
      </div>
      <div className="flex justify-end gap-3 rounded-b-lg border-t border-border bg-background px-6 py-4">
        <button type="button" autoFocus onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} className="btn-danger">
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
