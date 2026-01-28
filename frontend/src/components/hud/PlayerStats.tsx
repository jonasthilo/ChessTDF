import { useGameStore } from '../../state/gameStore';
import './PlayerStats.css';

export const PlayerStats = () => {
  const coins = useGameStore((state) => state.coins);
  const lives = useGameStore((state) => state.lives);

  return (
    <div className="player-stats">
      <div className="stat-item coins">
        <span className="stat-icon icon-coins"></span>
        <span className="stat-label">Coins:</span>
        <span className="stat-value">{coins}</span>
      </div>
      <div className="stat-item lives">
        <span className="stat-icon icon-lives"></span>
        <span className="stat-label">Lives:</span>
        <span className="stat-value">{lives}</span>
      </div>
    </div>
  );
};
