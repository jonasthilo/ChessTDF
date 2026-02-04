import { NumberField } from '../../common/NumberField';
import { SelectField } from '../../common/SelectField';
import type { TowerLevel, StatusEffectType, AuraEffectType } from '../../../types';

// Fields that can be edited in the level editor
type NumericLevelField =
  | 'cost'
  | 'damage'
  | 'range'
  | 'fireRate'
  | 'projectileSpeed'
  | 'splashRadius'
  | 'splashChance'
  | 'chainCount'
  | 'pierceCount'
  | 'targetCount'
  | 'effectDuration'
  | 'effectStrength'
  | 'auraRadius'
  | 'auraStrength';

type SelectLevelField = 'statusEffect' | 'auraEffect';

const STATUS_EFFECT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'slow', label: 'Slow' },
  { value: 'poison', label: 'Poison' },
  { value: 'armor_shred', label: 'Armor Shred' },
  { value: 'mark', label: 'Mark' },
];

const AURA_EFFECT_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'damage_buff', label: 'Damage Buff' },
  { value: 'speed_buff', label: 'Speed Buff' },
  { value: 'range_buff', label: 'Range Buff' },
];

interface TowerLevelEditorProps {
  level: TowerLevel;
  edits: Partial<TowerLevel>;
  onChange: (field: NumericLevelField | SelectLevelField, value: number | string) => void;
}

export const TowerLevelEditor = ({ level, edits, onChange }: TowerLevelEditorProps) => {
  const getNumericValue = (field: NumericLevelField): number => {
    const editValue = edits[field];
    if (editValue !== undefined) return editValue as number;
    return level[field];
  };

  const getSelectValue = (field: SelectLevelField): string => {
    const editValue = edits[field];
    if (editValue !== undefined) return editValue as string;
    return level[field];
  };

  return (
    <div className="definition-card level-card">
      <h4 className="definition-name">Level {level.level}</h4>
      <div className="definition-fields">
        <NumberField
          label={`${level.level === 1 ? 'Build Cost' : 'Upgrade Cost'} (min 1):`}
          min={1}
          value={getNumericValue('cost')}
          onChange={(v) => onChange('cost', v)}
        />
        <NumberField
          label="Damage (min 1):"
          min={1}
          value={getNumericValue('damage')}
          onChange={(v) => onChange('damage', v)}
        />
        <NumberField
          label="Range (min 1):"
          min={1}
          value={getNumericValue('range')}
          onChange={(v) => onChange('range', v)}
        />
        <NumberField
          label="Fire Rate (min 0.1):"
          min={0.1}
          step={0.1}
          value={getNumericValue('fireRate')}
          onChange={(v) => onChange('fireRate', v)}
        />
        <NumberField
          label="Projectile Speed:"
          min={100}
          step={50}
          value={getNumericValue('projectileSpeed')}
          onChange={(v) => onChange('projectileSpeed', v)}
        />

        <h5 className="section-label">Multi-Target</h5>
        <NumberField
          label="Pierce Count:"
          min={0}
          value={getNumericValue('pierceCount')}
          onChange={(v) => onChange('pierceCount', v)}
        />
        <NumberField
          label="Chain Count:"
          min={0}
          value={getNumericValue('chainCount')}
          onChange={(v) => onChange('chainCount', v)}
        />
        <NumberField
          label="Target Count:"
          min={1}
          value={getNumericValue('targetCount')}
          onChange={(v) => onChange('targetCount', v)}
        />

        <h5 className="section-label">Splash</h5>
        <NumberField
          label="Splash Radius:"
          min={0}
          value={getNumericValue('splashRadius')}
          onChange={(v) => onChange('splashRadius', v)}
        />
        <NumberField
          label="Splash Chance (%):"
          min={0}
          max={100}
          value={getNumericValue('splashChance')}
          onChange={(v) => onChange('splashChance', v)}
        />

        <h5 className="section-label">Status Effect</h5>
        <SelectField
          label="Status Effect:"
          value={getSelectValue('statusEffect')}
          options={STATUS_EFFECT_OPTIONS}
          onChange={(v) => onChange('statusEffect', v as StatusEffectType)}
        />
        <NumberField
          label="Effect Duration (ms):"
          min={0}
          step={100}
          value={getNumericValue('effectDuration')}
          onChange={(v) => onChange('effectDuration', v)}
        />
        <NumberField
          label="Effect Strength (%):"
          min={0}
          value={getNumericValue('effectStrength')}
          onChange={(v) => onChange('effectStrength', v)}
        />

        <h5 className="section-label">Aura</h5>
        <SelectField
          label="Aura Effect:"
          value={getSelectValue('auraEffect')}
          options={AURA_EFFECT_OPTIONS}
          onChange={(v) => onChange('auraEffect', v as AuraEffectType)}
        />
        <NumberField
          label="Aura Radius:"
          min={0}
          value={getNumericValue('auraRadius')}
          onChange={(v) => onChange('auraRadius', v)}
        />
        <NumberField
          label="Aura Strength (%):"
          min={0}
          value={getNumericValue('auraStrength')}
          onChange={(v) => onChange('auraStrength', v)}
        />
      </div>
    </div>
  );
};
