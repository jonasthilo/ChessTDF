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
              <span className="setting-label">HP Scaling</span>
              <span className="setting-value">
                +{(currentSettings.enemyHealthWaveMultiplier * 100).toFixed(0)}%/wave
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Reward Scaling</span>
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
