import { NumberField } from '../../common/NumberField';
import type { TowerLevel } from '../../../types';

// Numeric fields that can be edited in the basic level editor
type NumericLevelField = 'cost' | 'damage' | 'range' | 'fireRate';

interface TowerLevelEditorProps {
  level: TowerLevel;
  edits: Partial<TowerLevel>;
  onChange: (field: NumericLevelField, value: number) => void;
}

export const TowerLevelEditor = ({ level, edits, onChange }: TowerLevelEditorProps) => {
  const getValue = (field: NumericLevelField): number => {
    const editValue = edits[field];
    if (editValue !== undefined) return editValue;
    return level[field];
  };

  return (
    <div className="definition-card level-card">
      <h4 className="definition-name">Level {level.level}</h4>
      <div className="definition-fields">
        <NumberField
          label={`${level.level === 1 ? 'Build Cost' : 'Upgrade Cost'} (min 1):`}
          min={1}
          value={getValue('cost')}
          onChange={(v) => onChange('cost', v)}
        />
        <NumberField
          label="Damage (min 1):"
          min={1}
          value={getValue('damage')}
          onChange={(v) => onChange('damage', v)}
        />
        <NumberField
          label="Range (min 1):"
          min={1}
          value={getValue('range')}
          onChange={(v) => onChange('range', v)}
        />
        <NumberField
          label="Fire Rate (min 0.1):"
          min={0.1}
          step={0.1}
          value={getValue('fireRate')}
          onChange={(v) => onChange('fireRate', v)}
        />
      </div>
    </div>
  );
};
