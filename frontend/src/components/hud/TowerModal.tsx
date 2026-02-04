import { useState, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getTowerImage } from '../../utils/pieceAssets';
import { distance } from '../../utils/math';
import type { TargetingMode, Tower } from '../../types';
import './TowerModal.css';

const TARGETING_OPTIONS: { value: TargetingMode; label: string }[] = [
  { value: 'first', label: 'First (furthest along)' },
  { value: 'last', label: 'Last (most recent)' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'strongest', label: 'Strongest (highest HP)' },
  { value: 'weakest', label: 'Weakest (lowest HP)' },
];

// Calculate aura buff percentage from nearby King towers
function getAuraBuff(tower: Tower, allTowers: Tower[]): number {
  const auraTowers = allTowers.filter(
    (t) => t.attackType === 'aura' && t.stats.auraEffect === 'damage_buff' && t.id !== tower.id
  );

  if (auraTowers.length === 0) return 0;

  let totalBuff = 0;
  for (const auraTower of auraTowers) {
    const dist = distance(tower.x, tower.y, auraTower.x, auraTower.y);
    if (dist <= auraTower.stats.auraRadius) {
      totalBuff += auraTower.stats.auraStrength;
    }
  }
  return totalBuff;
}

export const TowerModal = () => {
  const selectedTower = useGameStore((state) => state.selectedTower);
  const selectTower = useGameStore((state) => state.selectTower);
  const upgradeTower = useGameStore((state) => state.upgradeTower);
  const sellTower = useGameStore((state) => state.sellTower);
  const setTowerTargetingMode = useGameStore((state) => state.setTowerTargetingMode);
  const coins = useGameStore((state) => state.coins);
  const towers = useGameStore((state) => state.towers);
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
  const nextLevelData = !isAtMaxLevel
    ? towerDef.levels.find((l) => l.level === currentLevel + 1)
    : null;
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

  // Calculate aura buff from nearby King towers
  const auraBuff = getAuraBuff(tower, towers);
  const hasAuraBuff = auraBuff > 0;

  const handleTargetingChange = (mode: TargetingMode) => {
    setTowerTargetingMode(tower.id, mode);
  };

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
      <button className="btn btn-ghost modal-close" onClick={handleClose}>
        X
      </button>

      <div className="modal-header">
        <img src={getTowerImage(tower.towerId)} alt={towerDef.name} className="tower-modal-icon" />
        <div className="modal-title">
          <h2>{towerDef.name}</h2>
          <span className="tower-level">
            Level {currentLevel} / {maxLevel}
          </span>
        </div>
      </div>

      {/* Targeting Selector (not for aura towers) */}
      {tower.attackType !== 'aura' && (
        <div className="modal-targeting">
          <label className="targeting-label">Targeting:</label>
          <select
            className="targeting-select"
            value={tower.targetingMode}
            onChange={(e) => handleTargetingChange(e.target.value as TargetingMode)}
          >
            {TARGETING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="modal-stats">
        <h3>Current Stats</h3>
        <div className="stat-row">
          <span className="stat-label">Damage:</span>
          <span className="stat-value">
            {currentStats.damage}
            {hasAuraBuff && (
              <span className="aura-buff"> (+{auraBuff}%)</span>
            )}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Range:</span>
          <span className="stat-value">{currentStats.range}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Fire Rate:</span>
          <span className="stat-value">{currentStats.fireRate.toFixed(1)}/s</span>
        </div>

        {/* Attack-type specific stats */}
        {tower.attackType === 'pierce' && currentStats.pierceCount > 0 && (
          <div className="stat-row">
            <span className="stat-label">Pierce:</span>
            <span className="stat-value">{currentStats.pierceCount} enemies</span>
          </div>
        )}
        {tower.attackType === 'chain' && currentStats.chainCount > 0 && (
          <div className="stat-row">
            <span className="stat-label">Chain:</span>
            <span className="stat-value">{currentStats.chainCount} jumps</span>
          </div>
        )}
        {tower.attackType === 'multi' && currentStats.targetCount > 1 && (
          <div className="stat-row">
            <span className="stat-label">Targets:</span>
            <span className="stat-value">{currentStats.targetCount}</span>
          </div>
        )}
        {tower.attackType === 'splash' && currentStats.splashRadius > 0 && (
          <>
            <div className="stat-row">
              <span className="stat-label">Splash Radius:</span>
              <span className="stat-value">{currentStats.splashRadius}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Splash Chance:</span>
              <span className="stat-value">{currentStats.splashChance}%</span>
            </div>
          </>
        )}

        {/* Status effect info */}
        {currentStats.statusEffect !== 'none' && (
          <div className="stat-row effect-row">
            <span className="stat-label">Effect:</span>
            <span className="stat-value">
              {currentStats.statusEffect === 'slow' && `Slow ${currentStats.effectStrength}%`}
              {currentStats.statusEffect === 'poison' && `Poison ${currentStats.effectStrength} DPS`}
              {currentStats.statusEffect === 'mark' && `Mark +${currentStats.effectStrength}% dmg`}
              {currentStats.statusEffect === 'armor_shred' && `Shred ${currentStats.effectStrength}%`}
              <span className="effect-duration"> ({(currentStats.effectDuration / 1000).toFixed(1)}s)</span>
            </span>
          </div>
        )}

        {/* Aura stats (for King towers) */}
        {tower.attackType === 'aura' && currentStats.auraEffect !== 'none' && (
          <>
            <div className="stat-row aura-row">
              <span className="stat-label">Aura:</span>
              <span className="stat-value">
                {currentStats.auraEffect === 'damage_buff' && `+${currentStats.auraStrength}% damage`}
                {currentStats.auraEffect === 'speed_buff' && `+${currentStats.auraStrength}% fire rate`}
                {currentStats.auraEffect === 'range_buff' && `+${currentStats.auraStrength}% range`}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Aura Radius:</span>
              <span className="stat-value">{currentStats.auraRadius}</span>
            </div>
          </>
        )}
      </div>

      {!isAtMaxLevel && nextLevelData && (
        <div className="modal-upgrade">
          <h3>Upgrade to Level {currentLevel + 1}</h3>
          <div className="upgrade-preview">
            <div>
              Damage: {currentStats.damage} → {nextLevelData.damage}
            </div>
            <div>
              Range: {currentStats.range} → {nextLevelData.range}
            </div>
            <div>
              Fire Rate: {currentStats.fireRate.toFixed(1)} → {nextLevelData.fireRate.toFixed(1)}
            </div>
          </div>
          <div
            style={{
              marginTop: '0.3rem',
              fontSize: '0.7rem',
              color: canAffordUpgrade ? '#4caf50' : '#f44336',
              textAlign: 'center',
            }}
          >
            {coins} / {upgradeCost} coins
          </div>
          <button
            className="btn btn-gold upgrade-button"
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
        <button className="btn btn-danger sell-button" onClick={handleSell}>
          Sell Tower (+{refundAmount} coins)
        </button>
      </div>
    </div>
  );
};
