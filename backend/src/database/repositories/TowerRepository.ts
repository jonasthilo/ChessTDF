import { query } from '../db';
import { TowerDefinition, TowerLevel } from '../../types';

export class TowerRepository {
  // Get all tower definitions (metadata only)
  async getAllTowerDefinitions(): Promise<TowerDefinition[]> {
    const result = await query<any>('SELECT * FROM tower_definitions ORDER BY id ASC');
    return result.rows.map(this.mapToTowerDefinition);
  }

  // Get tower definition by ID (metadata only)
  async getTowerDefinition(id: number): Promise<TowerDefinition | null> {
    const result = await query<any>('SELECT * FROM tower_definitions WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapToTowerDefinition(result.rows[0]);
  }

  // Get all tower levels for all towers
  async getAllTowerLevels(): Promise<TowerLevel[]> {
    const result = await query<any>('SELECT * FROM tower_levels ORDER BY tower_id ASC, level ASC');
    return result.rows.map(this.mapToTowerLevel);
  }

  // Get all levels for a tower ID
  async getTowerLevels(towerId: number): Promise<TowerLevel[]> {
    const result = await query<any>(
      'SELECT * FROM tower_levels WHERE tower_id = $1 ORDER BY level ASC',
      [towerId]
    );
    return result.rows.map(this.mapToTowerLevel);
  }

  // Get specific level for a tower ID
  async getTowerLevel(towerId: number, level: number): Promise<TowerLevel | null> {
    const result = await query<any>(
      'SELECT * FROM tower_levels WHERE tower_id = $1 AND level = $2',
      [towerId, level]
    );
    if (result.rows.length === 0) return null;
    return this.mapToTowerLevel(result.rows[0]);
  }

  // Get max level for a tower ID
  async getMaxLevel(towerId: number): Promise<number> {
    const result = await query<any>(
      'SELECT MAX(level) as max_level FROM tower_levels WHERE tower_id = $1',
      [towerId]
    );
    return result.rows[0]?.max_level ?? 0;
  }

  // Update tower definition (metadata only)
  async updateTowerDefinition(id: number, updates: Partial<TowerDefinition>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push(`color = $${paramIndex++}`);
      values.push(updates.color);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.maxLevel !== undefined) {
      fields.push(`max_level = $${paramIndex++}`);
      values.push(updates.maxLevel);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const sql = `UPDATE tower_definitions SET ${fields.join(', ')} WHERE id = $${paramIndex}`;

    const result = await query(sql, values);
    return (result.rowCount ?? 0) > 0;
  }

  // Update a tower level
  async updateTowerLevel(towerId: number, level: number, updates: Partial<TowerLevel>): Promise<boolean> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.cost !== undefined) {
      fields.push(`cost = $${paramIndex++}`);
      values.push(updates.cost);
    }
    if (updates.damage !== undefined) {
      fields.push(`damage = $${paramIndex++}`);
      values.push(updates.damage);
    }
    if (updates.range !== undefined) {
      fields.push(`range = $${paramIndex++}`);
      values.push(updates.range);
    }
    if (updates.fireRate !== undefined) {
      fields.push(`fire_rate = $${paramIndex++}`);
      values.push(updates.fireRate);
    }

    if (fields.length === 0) return false;

    values.push(towerId, level);
    const sql = `UPDATE tower_levels SET ${fields.join(', ')} WHERE tower_id = $${paramIndex} AND level = $${paramIndex + 1}`;

    const result = await query(sql, values);
    return (result.rowCount ?? 0) > 0;
  }

  // Create or update a tower level (upsert)
  async upsertTowerLevel(towerLevel: TowerLevel): Promise<boolean> {
    const result = await query(
      `INSERT INTO tower_levels (tower_id, level, cost, damage, range, fire_rate)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tower_id, level) DO UPDATE SET
         cost = EXCLUDED.cost,
         damage = EXCLUDED.damage,
         range = EXCLUDED.range,
         fire_rate = EXCLUDED.fire_rate`,
      [towerLevel.towerId, towerLevel.level, towerLevel.cost, towerLevel.damage, towerLevel.range, towerLevel.fireRate]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Delete a tower level
  async deleteTowerLevel(towerId: number, level: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM tower_levels WHERE tower_id = $1 AND level = $2',
      [towerId, level]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to TowerDefinition
  private mapToTowerDefinition(row: any): TowerDefinition {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
      maxLevel: row.max_level,
    };
  }

  // Helper: Map database row to TowerLevel
  private mapToTowerLevel(row: any): TowerLevel {
    return {
      id: row.id,
      towerId: row.tower_id,
      level: row.level,
      cost: row.cost,
      damage: row.damage,
      range: row.range,
      fireRate: parseFloat(row.fire_rate),
    };
  }
}
