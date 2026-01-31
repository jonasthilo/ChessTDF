import { ConfirmModal } from '../common/ConfirmModal';

interface EndGameModalProps {
  isOpen: boolean;
  onKeepPlaying: () => void;
  onEndGame: () => void;
}

export const EndGameModal = ({ isOpen, onKeepPlaying, onEndGame }: EndGameModalProps) => (
  <ConfirmModal
    isOpen={isOpen}
    title="Resign Game?"
    message="Your pieces will fall and the board will be lost. Are you sure?"
    cancelLabel="Keep Playing"
    confirmLabel="Resign"
    onCancel={onKeepPlaying}
    onConfirm={onEndGame}
  />
);
