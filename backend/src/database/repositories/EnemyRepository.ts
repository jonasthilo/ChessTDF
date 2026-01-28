import { query } from '../db';
import { EnemyDefinition } from '../../types';

export class EnemyRepository {
  // Get all enemy definitions
  async getAllEnemyDefinitions(): Promise<EnemyDefinition[]> {
    const result = await query<any>('SELECT * FROM enemy_definitions ORDER BY health ASC');
    return result.rows.map(this.mapToEnemyDefinition);
  }

  // Get enemy definition by ID
  async getEnemyDefinition(id: number): Promise<EnemyDefinition | null> {
    const result = await query<any>('SELECT * FROM enemy_definitions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapToEnemyDefinition(result.rows[0]);
  }

  // Update enemy definition (for admin/settings)
  async updateEnemyDefinition(id: number, updates: Partial<EnemyDefinition>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.health !== undefined) {
      fields.push(`health = $${paramIndex++}`);
      values.push(updates.health);
    }
    if (updates.speed !== undefined) {
      fields.push(`speed = $${paramIndex++}`);
      values.push(updates.speed);
    }
    if (updates.reward !== undefined) {
      fields.push(`reward = $${paramIndex++}`);
      values.push(updates.reward);
    }
    if (updates.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }
    if (updates.size !== undefined) {
      fields.push(`size = $${paramIndex++}`);
      values.push(updates.size);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE enemy_definitions SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    const result = await query(sql, values);
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to EnemyDefinition
  private mapToEnemyDefinition(row: any): EnemyDefinition {
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
