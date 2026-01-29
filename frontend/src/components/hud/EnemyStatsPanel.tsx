import { useState, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import type { Enemy } from '../../types';
import './EnemyStatsPanel.css';

const ENEMY_PIECE_MAP: Record<number, string> = {
  1: '/assets/pieces/black/pawn.svg',
  2: '/assets/pieces/black/knight.svg',
  3: '/assets/pieces/black/bishop.svg',
  4: '/assets/pieces/black/rook.svg',
  5: '/assets/pieces/black/queen.svg',
  6: '/assets/pieces/black/king.svg',
};

export const EnemyStatsPanel = () => {
  const selectedEnemy = useGameStore((state) => state.selectedEnemy);
  const selectEnemy = useGameStore((state) => state.selectEnemy);

  const [isClosing, setIsClosing] = useState(false);
  const [closingEnemyData, setClosingEnemyData] = useState<Enemy | null>(null);

  // Capture enemy data in cleanup when enemy is deselected
  useEffect(() => {
    const currentEnemy = selectedEnemy;
    return () => {
      if (currentEnemy) {
        setClosingEnemyData(currentEnemy);
        setIsClosing(true);
      }
    };
  }, [selectedEnemy]);

  // End close animation after timeout
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        setIsClosing(false);
        setClosingEnemyData(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isClosing]);

  const renderPanel = !!selectedEnemy || isClosing;
  const displayEnemy = selectedEnemy ?? closingEnemyData;
  const showClosingAnimation = !selectedEnemy && isClosing;

  if (!renderPanel || !displayEnemy) return null;

  const enemy = displayEnemy;
  const def = enemy.definition;
  const healthPercent = Math.max(0, (enemy.health / enemy.maxHealth) * 100);
  const pieceImage = ENEMY_PIECE_MAP[enemy.enemyId] ?? ENEMY_PIECE_MAP[1]!;

  const getHealthColor = (percent: number): string => {
    if (percent > 60) return '#4db8a0';
    if (percent > 30) return '#f4c542';
    return '#e85d75';
  };

  const handleClose = () => {
    selectEnemy(null);
  };

  return (
    <div className={`enemy-stats-panel ${showClosingAnimation ? 'closing' : ''}`}>
      <button className="panel-close" onClick={handleClose}>
        X
      </button>

      <div className="panel-header">
        <img src={pieceImage} alt={def.name} className="enemy-panel-icon" />
        <div className="panel-title">
          <h2>{def.name}</h2>
          <span className="enemy-type">{def.description}</span>
        </div>
      </div>

      <div className="panel-health">
        <div className="health-label">
          <span>HP</span>
          <span>
            {enemy.health} / {enemy.maxHealth}
          </span>
        </div>
        <div className="health-bar-bg">
          <div
            className="health-bar-fill"
            style={{
              width: `${healthPercent}%`,
              backgroundColor: getHealthColor(healthPercent),
            }}
          />
        </div>
      </div>

      <div className="panel-stats">
        <h3>Stats</h3>
        <div className="stat-row">
          <span className="stat-label">Speed:</span>
          <span className="stat-value">{def.speed} px/s</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Reward:</span>
          <span className="stat-value">{def.reward} coins</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Size:</span>
          <span className="stat-value">{def.size}</span>
        </div>
      </div>
    </div>
  );
};
