import { useState, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import './TowerModal.css';

export const TowerModal = () => {
  const selectedTower = useGameStore((state) => state.selectedTower);
  const selectTower = useGameStore((state) => state.selectTower);
  const upgradeTower = useGameStore((state) => state.upgradeTower);
  const sellTower = useGameStore((state) => state.sellTower);
  const coins = useGameStore((state) => state.coins);
  const getTowerDefinition = useGameStore((state) => state.getTowerDefinition);

  const [isClosing, setIsClosing] = useState(false);
  const [renderModal, setRenderModal] = useState(false);

  useEffect(() => {
    if (selectedTower) {
      setRenderModal(true);
      setIsClosing(false);
    } else if (renderModal) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setRenderModal(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedTower, renderModal]);

  const getTowerImage = (towerId: number): string => {
    switch (towerId) {
      case 1:
        return '/assets/pieces/white/pawn.svg';
      case 2:
        return '/assets/pieces/white/rook.svg';
      case 3:
        return '/assets/pieces/white/knight.svg';
      default:
        return '/assets/pieces/white/pawn.svg';
    }
  };

  if (!renderModal || !selectedTower) return null;

  const tower = selectedTower;
  const towerDef = getTowerDefinition(tower.towerId);

  if (!towerDef) {
    console.error('Tower definition not found for towerId:', tower.towerId);
    return null;
  }

  const currentLevel = tower.level;
  const maxLevel = towerDef.maxLevel;

  // Get current level data
  const currentLevelData = towerDef.levels.find((l) => l.level === currentLevel);
  if (!currentLevelData) {
    console.error('Current level data not found:', currentLevel);
    return null;
  }

  // Get next level data (if not at max)
  const isAtMaxLevel = currentLevel >= maxLevel;
  const nextLevelData = !isAtMaxLevel ? towerDef.levels.find((l) => l.level === currentLevel + 1) : null;
  const upgradeCost = nextLevelData?.cost ?? null;
  const canAffordUpgrade = upgradeCost !== null && coins >= upgradeCost;

  // Calculate refund (70% of total invested)
  let totalInvested = 0;
  for (let i = 1; i <= currentLevel; i++) {
    const levelData = towerDef.levels.find((l) => l.level === i);
    if (levelData) totalInvested += levelData.cost;
  }
  const refundAmount = Math.round(totalInvested * 0.7);

  // Current stats come directly from tower.stats
  const currentStats = tower.stats;

  const handleUpgrade = async () => {
    if (!canAffordUpgrade) return;
    await upgradeTower(tower.id);
  };

  const handleSell = async () => {
    await sellTower(tower.id);
  };

  const handleClose = () => {
    selectTower(null);
  };

  return (
    <div className={`tower-modal ${isClosing ? 'closing' : ''}`}>
      <button className="modal-close" onClick={handleClose}>
        X
      </button>

      <div className="modal-header">
        <img
          src={getTowerImage(tower.towerId)}
          alt={towerDef.name}
          className="tower-modal-icon"
        />
        <div className="modal-title">
          <h2>{towerDef.name}</h2>
          <span className="tower-level">Level {currentLevel} / {maxLevel}</span>
        </div>
      </div>

      <div className="modal-stats">
        <h3>Current Stats</h3>
        <div className="stat-row">
          <span className="stat-label">Damage:</span>
          <span className="stat-value">{currentStats.damage}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Range:</span>
          <span className="stat-value">{currentStats.range}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Fire Rate:</span>
          <span className="stat-value">{currentStats.fireRate.toFixed(1)}/s</span>
        </div>
      </div>

      {!isAtMaxLevel && nextLevelData && (
        <div className="modal-upgrade">
          <h3>Upgrade to Level {currentLevel + 1}</h3>
          <div className="upgrade-preview">
            <div>Damage: {currentStats.damage} → {nextLevelData.damage}</div>
            <div>Range: {currentStats.range} → {nextLevelData.range}</div>
            <div>Fire Rate: {currentStats.fireRate.toFixed(1)} → {nextLevelData.fireRate.toFixed(1)}</div>
          </div>
          <div style={{
            marginTop: '0.3rem',
            fontSize: '0.7rem',
            color: canAffordUpgrade ? '#4caf50' : '#f44336',
            textAlign: 'center'
          }}>
            {coins} / {upgradeCost} coins
          </div>
          <button
            className={`upgrade-button ${!canAffordUpgrade ? 'disabled' : ''}`}
            onClick={handleUpgrade}
            disabled={!canAffordUpgrade}
          >
            Upgrade ({upgradeCost} coins)
          </button>
        </div>
      )}

      {isAtMaxLevel && <div className="max-level-badge">MAX LEVEL</div>}

      {!isAtMaxLevel && !nextLevelData && (
        <div className="max-level-badge" style={{ background: '#ff9800' }}>
          Level Data Missing - Contact Admin
        </div>
      )}

      <div className="modal-sell">
        <button className="sell-button" onClick={handleSell}>
          Sell Tower (+{refundAmount} coins)
        </button>
      </div>
    </div>
  );
};
