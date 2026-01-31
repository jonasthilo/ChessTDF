import type { GameSettings } from '../../types';
import { capitalize } from '../../utils/string';

interface DifficultySelectorProps {
  settings: GameSettings[];
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

const DIFFICULTY_MODES = ['easy', 'normal', 'hard'] as const;

export const DifficultySelector = ({
  settings,
  selectedMode,
  onSelectMode,
}: DifficultySelectorProps) => {
  const currentSettings = settings.find((s) => s.mode === selectedMode);

  return (
    <>
      <div className="difficulty-options">
        {DIFFICULTY_MODES.map((mode) => (
          <button
            key={mode}
            className={`btn btn-dark btn-sm difficulty-button ${selectedMode === mode ? 'selected' : ''}`}
            onClick={() => onSelectMode(mode)}
          >
            {capitalize(mode)}
          </button>
        ))}
      </div>

      {currentSettings && (
        <div className="settings-details">
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">Coins</span>
              <span className="setting-value">{currentSettings.initialCoins}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Lives</span>
              <span className="setting-value">{currentSettings.initialLives}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Tower Cost</span>
              <span className="setting-value">
                {(currentSettings.towerCostMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Enemy HP</span>
              <span className="setting-value">
                {(currentSettings.enemyHealthMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Enemy Speed</span>
              <span className="setting-value">
                {(currentSettings.enemySpeedMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Rewards</span>
              <span className="setting-value">
                {(currentSettings.enemyRewardMultiplier * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
