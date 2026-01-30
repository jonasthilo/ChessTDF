import { NumberField } from '../../common/NumberField';
import { TextField } from '../../common/TextField';
import { getEnemyImage } from '../../../utils/pieceAssets';
import type { EnemyDefinition } from '../../../types';

interface EnemyEditorProps {
  enemy: EnemyDefinition;
  edits: Partial<EnemyDefinition>;
  onChange: (field: keyof EnemyDefinition, value: number | string) => void;
}

export const EnemyEditor = ({ enemy, edits, onChange }: EnemyEditorProps) => {
  const getValue = <K extends keyof EnemyDefinition>(field: K): EnemyDefinition[K] => {
    const editValue = edits[field];
    if (editValue !== undefined) return editValue as EnemyDefinition[K];
    return enemy[field];
  };

  return (
    <div className="definition-card">
      <div className="definition-header">
        <img src={getEnemyImage(enemy.id)} alt={enemy.name} className="piece-icon" />
        <h4 className="definition-name">{enemy.name}</h4>
      </div>
      <div className="definition-fields">
        <TextField label="Name:" value={getValue('name')} onChange={(v) => onChange('name', v)} />
        <TextField
          label="Description:"
          value={getValue('description')}
          onChange={(v) => onChange('description', v)}
        />
        <NumberField
          label="Health (min 1):"
          min={1}
          value={getValue('health')}
          onChange={(v) => onChange('health', v)}
        />
        <NumberField
          label="Speed (min 1):"
          min={1}
          value={getValue('speed')}
          onChange={(v) => onChange('speed', v)}
        />
        <NumberField
          label="Reward (min 0):"
          min={0}
          value={getValue('reward')}
          onChange={(v) => onChange('reward', v)}
        />
        <NumberField
          label="Size (min 1):"
          min={1}
          value={getValue('size')}
          onChange={(v) => onChange('size', v)}
        />
        <TextField
          label="Color:"
          type="color"
          value={getValue('color')}
          onChange={(v) => onChange('color', v)}
        />
      </div>
    </div>
  );
};
