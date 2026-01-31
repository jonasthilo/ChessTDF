import { useState, useEffect, useCallback } from 'react';
import './EndGameModal.css';

interface EndGameModalProps {
  isOpen: boolean;
  onKeepPlaying: () => void;
  onEndGame: () => void;
}

export const EndGameModal = ({ isOpen, onKeepPlaying, onEndGame }: EndGameModalProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const renderModal = isOpen || isClosing;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onKeepPlaying();
    }, 250);
  }, [onKeepPlaying]);

  const handleEndGame = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onEndGame();
    }, 250);
  }, [onEndGame]);

  useEffect(() => {
    if (!renderModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderModal, handleClose]);

  if (!renderModal) return null;

  return (
    <div className="end-game-overlay" onClick={handleClose}>
      <div
        className={`end-game-modal ${isClosing ? 'closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="end-game-title">Resign Game?</h2>
        <p className="end-game-message">
          Your pieces will fall and the board will be lost. Are you sure?
        </p>
        <div className="end-game-actions">
          <button className="btn btn-gold btn-lg" onClick={handleClose}>
            Keep Playing
          </button>
          <button className="btn btn-danger btn-lg" onClick={handleEndGame}>
            Resign
          </button>
        </div>
      </div>
    </div>
  );
};
