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
    }, 300);
  }, [onKeepPlaying]);

  const handleEndGame = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onEndGame();
    }, 300);
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
        <h2 className="end-game-title">End Game?</h2>
        <p className="end-game-message">Are you sure you want to end the current game?</p>
        <div className="end-game-actions">
          <button className="keep-playing-btn" onClick={handleClose}>
            Keep Playing
          </button>
          <button className="confirm-end-btn" onClick={handleEndGame}>
            End Game
          </button>
        </div>
      </div>
    </div>
  );
};
