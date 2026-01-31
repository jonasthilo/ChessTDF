import { useState, useEffect, useCallback } from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const renderModal = isOpen || isClosing;

  const handleCancel = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 250);
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onConfirm();
    }, 250);
  }, [onConfirm]);

  useEffect(() => {
    if (!renderModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderModal, handleCancel]);

  if (!renderModal) return null;

  return (
    <div className="confirm-overlay" onClick={handleCancel}>
      <div
        className={`confirm-modal ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-gold btn-lg" onClick={handleCancel}>
            {cancelLabel}
          </button>
          <button className="btn btn-danger btn-lg" onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
