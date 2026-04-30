import { useEffect } from 'react';
import { Button } from '../Button';

/**
 * Props del componente ConfirmModal.
 *
 * Modal de confirmación genérico con dos acciones: aceptar / cancelar.
 * Reutiliza el mismo patrón visual que `AuthModal`.
 */
export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  // Cerrar con Escape.
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="auth-modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="auth-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <button
          type="button"
          className="auth-modal__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="confirm-modal-title" className="auth-modal__title">
          {title}
        </h2>

        {description && <p className="confirm-modal__description">{description}</p>}

        <div className="confirm-modal__actions">
          <Button size="small" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button size="small" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
