import { useGameStore } from '../../state/gameStore';
import './TowerPanel.css';

export const TowerPanel = () => {
  const towerDefinitions = useGameStore((state) => state.towerDefinitions);
  const selectedTowerId = useGameStore((state) => state.selectedTowerId);
  const selectTowerId = useGameStore((state) => state.selectTowerId);
  const coins = useGameStore((state) => state.coins);

  const handleTowerClick = (towerId: number) => {
    if (selectedTowerId === towerId) {
      selectTowerId(null);
    } else {
      selectTowerId(towerId);
    }
  };

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

  return (
    <div className="tower-panel">
      <h3 className="tower-panel-title">Build Towers</h3>
      <div className="tower-list">
        {towerDefinitions.map((towerDef) => {
          // Get level 1 stats for display
          const level1 = towerDef.levels.find((l) => l.level === 1);
          if (!level1) return null;

          const canAfford = coins >= level1.cost;
          const isSelected = selectedTowerId === towerDef.id;

          return (
            <div
              key={towerDef.id}
              className={`tower-item ${isSelected ? 'selected' : ''} ${
                !canAfford ? 'disabled' : ''
              }`}
              onClick={() => canAfford && handleTowerClick(towerDef.id)}
            >
              <img src={getTowerImage(towerDef.id)} alt={towerDef.name} className="tower-icon" />
              <div className="tower-info">
                <div className="tower-name">{towerDef.name}</div>
                <div className="tower-cost">
                  <span className="cost-icon"></span>
                  {level1.cost}
                </div>
              </div>
              <div className="tower-stats">
                <div className="tower-stat">
                  <span className="stat-label">DMG:</span> {level1.damage}
                </div>
                <div className="tower-stat">
                  <span className="stat-label">RNG:</span> {level1.range}
                </div>
                <div className="tower-stat">
                  <span className="stat-label">SPD:</span> {level1.fireRate.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {selectedTowerId && <div className="tower-panel-hint">Click on the grid to place tower</div>}
    </div>
  );
};
