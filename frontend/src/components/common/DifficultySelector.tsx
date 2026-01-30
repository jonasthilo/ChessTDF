import type { GameSettings } from '../../types';

interface DifficultySelectorProps {
  settings: GameSettings[];
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

const DIFFICULTY_MODES = ['easy', 'normal', 'hard'] as const;

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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
            className={`difficulty-button ${selectedMode === mode ? 'selected' : ''}`}
            onClick={() => onSelectMode(mode)}
          >
            {capitalize(mode)}
          </button>
        ))}
      </div>

      {currentSettings && (
        <div className="settings-details">
          <h3>Mode Details: {capitalize(selectedMode)}</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">Starting Coins:</span>
              <span className="setting-value">{currentSettings.initialCoins}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Starting Lives:</span>
              <span className="setting-value">{currentSettings.initialLives}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Tower Cost:</span>
              <span className="setting-value">
                {(currentSettings.towerCostMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Enemy Health:</span>
              <span className="setting-value">
                {(currentSettings.enemyHealthMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Enemy Speed:</span>
              <span className="setting-value">
                {(currentSettings.enemySpeedMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Enemy Rewards:</span>
              <span className="setting-value">
                {(currentSettings.enemyRewardMultiplier * 100).toFixed(0)}%
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Health Wave Scaling:</span>
              <span className="setting-value">
                +{(currentSettings.enemyHealthWaveMultiplier * 100).toFixed(0)}%/wave
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Reward Wave Scaling:</span>
              <span className="setting-value">
                +{(currentSettings.enemyRewardWaveMultiplier * 100).toFixed(0)}%/wave
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
