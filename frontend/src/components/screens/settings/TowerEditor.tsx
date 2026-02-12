import { NumberField } from '../../common/NumberField';
import { TextField } from '../../common/TextField';
import { SelectField } from '../../common/SelectField';
import { getTowerImage } from '../../../utils/pieceAssets';
import type { TowerDefinitionWithLevels, AttackType, ProjectileType, TargetingMode } from '../../../types';

const ATTACK_TYPE_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'pierce', label: 'Pierce' },
  { value: 'splash', label: 'Splash' },
  { value: 'chain', label: 'Chain' },
  { value: 'multi', label: 'Multi' },
  { value: 'aura', label: 'Aura' },
];

const PROJECTILE_TYPE_OPTIONS = [
  { value: 'homing', label: 'Homing' },
  { value: 'ballistic', label: 'Ballistic' },
  { value: 'lob', label: 'Lob' },
];

const TARGETING_MODE_OPTIONS = [
  { value: 'first', label: 'First' },
  { value: 'last', label: 'Last' },
  { value: 'nearest', label: 'Nearest' },
  { value: 'strongest', label: 'Strongest' },
  { value: 'weakest', label: 'Weakest' },
];

interface TowerEditorProps {
  tower: TowerDefinitionWithLevels;
  edits: Partial<Omit<TowerDefinitionWithLevels, 'levels'>>;
  onChange: (
    field: keyof Omit<TowerDefinitionWithLevels, 'levels'>,
    value: number | string | AttackType | ProjectileType | TargetingMode
  ) => void;
}

export const TowerEditor = ({ tower, edits, onChange }: TowerEditorProps) => {
  const getValue = <K extends keyof TowerDefinitionWithLevels>(
    field: K
  ): TowerDefinitionWithLevels[K] => {
    const editValue = edits[field as keyof typeof edits];
    if (editValue !== undefined) return editValue as TowerDefinitionWithLevels[K];
    return tower[field];
  };

  return (
    <div className="definition-card">
      <div className="definition-header">
        <img src={getTowerImage(tower.id)} alt={tower.name} className="piece-icon" />
        <h4 className="definition-name">{tower.name}</h4>
      </div>
      <div className="definition-fields">
        <TextField label="Name:" value={getValue('name')} onChange={(v) => onChange('name', v)} />
        <TextField
          label="Color:"
          type="color"
          value={getValue('color')}
          onChange={(v) => onChange('color', v)}
        />
        <TextField
          label="Description:"
          value={getValue('description')}
          onChange={(v) => onChange('description', v)}
        />
        <NumberField
          label="Max Level (1-10):"
          min={1}
          max={10}
          value={getValue('maxLevel')}
          onChange={(v) => onChange('maxLevel', v)}
        />
        <SelectField
          label="Attack Type:"
          value={getValue('attackType')}
          options={ATTACK_TYPE_OPTIONS}
          onChange={(v) => onChange('attackType', v as AttackType)}
        />
        <SelectField
          label="Projectile Type:"
          value={getValue('projectileType')}
          options={PROJECTILE_TYPE_OPTIONS}
          onChange={(v) => onChange('projectileType', v as ProjectileType)}
        />
        <SelectField
          label="Default Targeting:"
          value={getValue('defaultTargeting')}
          options={TARGETING_MODE_OPTIONS}
          onChange={(v) => onChange('defaultTargeting', v as TargetingMode)}
        />
      </div>
    </div>
  );
};
