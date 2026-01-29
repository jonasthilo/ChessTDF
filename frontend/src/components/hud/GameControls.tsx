import { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { PathManager } from '../../game/managers/PathManager';
import { EndGameModal } from './EndGameModal';
import type { EnemySpawnData } from '../../types';
import './GameControls.css';

const pathManager = new PathManager();

export const GameControls = () => {
  const wave = useGameStore((state) => state.wave);
  const gameId = useGameStore((state) => state.gameId);
  const gameSpeed = useGameStore((state) => state.gameSpeed);
  const toggleGameSpeed = useGameStore((state) => state.toggleGameSpeed);
  const startWave = useGameStore((state) => state.startWave);
  const endGame = useGameStore((state) => state.endGame);
  const addEnemy = useGameStore((state) => state.addEnemy);
  const enemyDefinitions = useGameStore((state) => state.enemyDefinitions);
  const setWaveEnemiesTotal = useGameStore((state) => state.setWaveEnemiesTotal);
  const [showEndGameModal, setShowEndGameModal] = useState(false);

  const handleStartWave = async () => {
    if (!gameId) return;

    try {
      const spawnData = await startWave();
      if (!spawnData) return;

      // Track total enemies for this wave
      setWaveEnemiesTotal(spawnData.length);

      // Get wave scaling multipliers from store
      const storeState = useGameStore.getState();
      const waveNumber = storeState.wave;
      const healthWaveMult = storeState.enemyHealthWaveMultiplier;
      const rewardWaveMult = storeState.enemyRewardWaveMultiplier;

      // Schedule enemy spawns based on spawn delays
      spawnData.forEach((data: EnemySpawnData) => {
        setTimeout(() => {
          const spawnPos = pathManager.getSpawnPosition();
          const enemyDef = enemyDefinitions.find((e) => e.id === data.enemyId);
          if (!enemyDef) return;

          // Apply per-wave scaling: baseStat * (1 + waveNumber * waveMultiplier)
          const scaledHealth = Math.round(enemyDef.health * (1 + waveNumber * healthWaveMult));
          const scaledReward = Math.round(enemyDef.reward * (1 + waveNumber * rewardWaveMult));

          addEnemy({
            id: `enemy-${Date.now()}-${Math.random()}`,
            enemyId: data.enemyId,
            definition: enemyDef,
            health: scaledHealth,
            maxHealth: scaledHealth,
            scaledReward,
            x: spawnPos.x,
            y: spawnPos.y,
            isDead: false,
          });
        }, data.spawnDelay);
      });
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
      <button className="game-button end-game-button" onClick={handleEndGame}>
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
