// Modal on the native <dialog> (focus trap, Esc, inert background) plus ConfirmDialog.
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { strings } from '../strings';
import { Button } from './Button';
import type { ButtonVariant } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons row; defaults to a single Close button. */
  actions?: ReactNode;
  /** While true, Esc / native cancel does not close the dialog (pending request). */
  busy?: boolean;
}

export function Modal({ open, title, onClose, children, actions, busy }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClose={onClose}
    >
      {open && (
        <>
          <h2 id={titleId}>{title}</h2>
          <div>{children}</div>
          <div className="modal__actions">
            {actions ?? <Button onClick={onClose}>{strings.common.close}</Button>}
          </div>
        </>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Extract<ButtonVariant, 'primary' | 'danger'>;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = strings.common.confirm,
  cancelLabel = strings.common.cancel,
  tone = 'primary',
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      busy={busy}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
