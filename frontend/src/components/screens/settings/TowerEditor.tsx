import { NumberField } from '../../common/NumberField';
import { TextField } from '../../common/TextField';
import { getTowerImage } from '../../../utils/pieceAssets';
import type { TowerDefinitionWithLevels } from '../../../types';

interface TowerEditorProps {
  tower: TowerDefinitionWithLevels;
  edits: Partial<Omit<TowerDefinitionWithLevels, 'levels'>>;
  onChange: (
    field: keyof Omit<TowerDefinitionWithLevels, 'levels'>,
    value: number | string
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
      </div>
    </div>
  );
};
