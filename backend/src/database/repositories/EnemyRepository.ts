import { query } from '../db';
import { EnemyDefinition } from '../../types';
import { buildUpdateFields } from '../helpers';

interface EnemyRow {
  id: number;
  name: string;
  description: string;
  health: number;
  speed: number;
  reward: number;
  color: string;
  size: number;
}

export class EnemyRepository {
  // Get all enemy definitions
  async getAllEnemyDefinitions(): Promise<EnemyDefinition[]> {
    const result = await query<EnemyRow>('SELECT * FROM enemy_definitions ORDER BY health ASC');
    return result.rows.map(this.mapToEnemyDefinition);
  }

  // Get enemy definition by ID
  async getEnemyDefinition(id: number): Promise<EnemyDefinition | null> {
    const result = await query<EnemyRow>('SELECT * FROM enemy_definitions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapToEnemyDefinition(result.rows[0]!);
  }

  // Update enemy definition (for admin/settings)
  async updateEnemyDefinition(id: number, updates: Partial<EnemyDefinition>): Promise<boolean> {
    const built = buildUpdateFields(updates, {
      name: 'name',
      description: 'description',
      health: 'health',
      speed: 'speed',
      reward: 'reward',
      color: 'color',
      size: 'size',
    });
    if (!built) return false;

    built.values.push(id);
    const sql = `UPDATE enemy_definitions SET ${built.fields.join(', ')} WHERE id = $${built.nextParam}`;
    const result = await query(sql, built.values);
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to EnemyDefinition
  private mapToEnemyDefinition(row: EnemyRow): EnemyDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      health: row.health,
      speed: row.speed,
      reward: row.reward,
      color: row.color,
      size: row.size,
    };
  }
}
