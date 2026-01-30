import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { EndGameModal } from './EndGameModal';
import './GameControls.css';

export const GameControls = () => {
  const wave = useGameStore((state) => state.wave);
  const gameId = useGameStore((state) => state.gameId);
  const gameSpeed = useGameStore((state) => state.gameSpeed);
  const toggleGameSpeed = useGameStore((state) => state.toggleGameSpeed);
  const startWave = useGameStore((state) => state.startWave);
  const endGame = useGameStore((state) => state.endGame);
  const setWaveEnemiesTotal = useGameStore((state) => state.setWaveEnemiesTotal);
  const setSpawnQueue = useGameStore((state) => state.setSpawnQueue);
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  const handleStartWave = async () => {
    if (!gameId) return;

    try {
      const spawnData = await startWave();
      if (!spawnData) return;

      // Track total enemies for this wave
      setWaveEnemiesTotal(spawnData.length);

      // Queue spawns to be processed by the game loop (respects gameSpeed)
      setSpawnQueue(spawnData);
    } catch (error) {
      console.error('Failed to start wave:', error);
    }
  };

  const handleEndGame = () => {
    setShowEndGameModal(true);
  };

  return (
    <div className="game-controls">
      <button className="game-button speed-button" onClick={toggleGameSpeed}>
        {gameSpeed === 1 ? 'Fast forward' : 'Normal speed'}
      </button>
      <button className="game-button wave-button" onClick={handleStartWave}>
        {wave === 0 ? 'Start First Wave' : 'Send Next Wave'}
      </button>
      <button className="nav-action-btn" onClick={handleEndGame}>
        End Game
      </button>
      <EndGameModal
        isOpen={showEndGameModal}
        onKeepPlaying={() => setShowEndGameModal(false)}
        onEndGame={() => {
          setShowEndGameModal(false);
          endGame('loss');
        }}
      />
    </div>
  );
};
