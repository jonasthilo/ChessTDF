import { NumberField } from '../../common/NumberField';
import type { GameSettings } from '../../../types';

interface SettingsEditorProps {
  setting: GameSettings;
  edits: Partial<GameSettings>;
  onChange: (field: keyof GameSettings, value: number) => void;
}

export const SettingsEditor = ({ setting, edits, onChange }: SettingsEditorProps) => {
  const getValue = (field: keyof GameSettings): number => {
    const editValue = edits[field];
    if (editValue !== undefined) return editValue as number;
    return setting[field] as number;
  };

  return (
    <div className="definition-card">
      <h4 className="definition-name">
        {setting.mode.charAt(0).toUpperCase() + setting.mode.slice(1)} Mode
      </h4>
      <div className="definition-fields">
        <NumberField
          label="Initial Coins (50-1000):"
          min={50}
          max={1000}
          value={getValue('initialCoins')}
          onChange={(v) => onChange('initialCoins', v)}
        />
        <NumberField
          label="Initial Lives (1-50):"
          min={1}
          max={50}
          value={getValue('initialLives')}
          onChange={(v) => onChange('initialLives', v)}
        />
        <NumberField
          label="Tower Cost Multiplier (0.5-3.0):"
          min={0.5}
          max={3.0}
          step={0.1}
          value={getValue('towerCostMultiplier')}
          onChange={(v) => onChange('towerCostMultiplier', v)}
        />
        <NumberField
          label="Enemy Health Multiplier (0.5-3.0):"
          min={0.5}
          max={3.0}
          step={0.1}
          value={getValue('enemyHealthMultiplier')}
          onChange={(v) => onChange('enemyHealthMultiplier', v)}
        />
        <NumberField
          label="Enemy Speed Multiplier (0.5-3.0):"
          min={0.5}
          max={3.0}
          step={0.1}
          value={getValue('enemySpeedMultiplier')}
          onChange={(v) => onChange('enemySpeedMultiplier', v)}
        />
        <NumberField
          label="Enemy Reward Multiplier (0.5-3.0):"
          min={0.5}
          max={3.0}
          step={0.1}
          value={getValue('enemyRewardMultiplier')}
          onChange={(v) => onChange('enemyRewardMultiplier', v)}
        />
        <NumberField
          label="Enemy Health Wave Scaling (0-1):"
          min={0}
          max={1}
          step={0.01}
          value={getValue('enemyHealthWaveMultiplier')}
          onChange={(v) => onChange('enemyHealthWaveMultiplier', v)}
        />
        <NumberField
          label="Enemy Reward Wave Scaling (0-1):"
          min={0}
          max={1}
          step={0.01}
          value={getValue('enemyRewardWaveMultiplier')}
          onChange={(v) => onChange('enemyRewardWaveMultiplier', v)}
        />
      </div>
    </div>
  );
};
