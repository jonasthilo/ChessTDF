import { query } from '../db';
import {
  TowerDefinition,
  TowerLevel,
  AttackType,
  ProjectileType,
  TargetingMode,
  StatusEffectType,
  AuraEffectType,
} from '../../types';
import { buildUpdateFields } from '../helpers';

interface TowerDefinitionRow {
  id: number;
  name: string;
  color: string;
  description: string;
  max_level: number;
  attack_type: string;
  projectile_type: string;
  default_targeting: string;
}

interface TowerLevelRow {
  id: number;
  tower_id: number;
  level: number;
  cost: number;
  damage: number;
  range: number;
  fire_rate: string;
  projectile_speed: number;
  splash_radius: number;
  splash_chance: number;
  chain_count: number;
  pierce_count: number;
  target_count: number;
  status_effect: string;
  effect_duration: number;
  effect_strength: number;
  aura_radius: number;
  aura_effect: string;
  aura_strength: number;
}

interface MaxLevelRow {
  max_level: number;
}

export class TowerRepository {
  // Get all tower definitions (metadata only)
  async getAllTowerDefinitions(): Promise<TowerDefinition[]> {
    const result = await query<TowerDefinitionRow>(
      'SELECT * FROM tower_definitions ORDER BY id ASC'
    );
    return result.rows.map(this.mapToTowerDefinition);
  }

  // Get tower definition by ID (metadata only)
  async getTowerDefinition(id: number): Promise<TowerDefinition | null> {
    const result = await query<TowerDefinitionRow>(
      'SELECT * FROM tower_definitions WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this.mapToTowerDefinition(result.rows[0]!);
  }

  // Get all tower levels for all towers
  async getAllTowerLevels(): Promise<TowerLevel[]> {
    const result = await query<TowerLevelRow>(
      'SELECT * FROM tower_levels ORDER BY tower_id ASC, level ASC'
    );
    return result.rows.map(this.mapToTowerLevel);
  }

  // Get all levels for a tower ID
  async getTowerLevels(towerId: number): Promise<TowerLevel[]> {
    const result = await query<TowerLevelRow>(
      'SELECT * FROM tower_levels WHERE tower_id = $1 ORDER BY level ASC',
      [towerId]
    );
    return result.rows.map(this.mapToTowerLevel);
  }

  // Get specific level for a tower ID
  async getTowerLevel(towerId: number, level: number): Promise<TowerLevel | null> {
    const result = await query<TowerLevelRow>(
      'SELECT * FROM tower_levels WHERE tower_id = $1 AND level = $2',
      [towerId, level]
    );
    if (result.rows.length === 0) return null;
    return this.mapToTowerLevel(result.rows[0]!);
  }

  // Get max level for a tower ID
  async getMaxLevel(towerId: number): Promise<number> {
    const result = await query<MaxLevelRow>(
      'SELECT MAX(level) as max_level FROM tower_levels WHERE tower_id = $1',
      [towerId]
    );
    return result.rows[0]?.max_level ?? 0;
  }

  // Update tower definition (metadata only)
  async updateTowerDefinition(id: number, updates: Partial<TowerDefinition>): Promise<boolean> {
    const built = buildUpdateFields(updates, {
      name: 'name',
      color: 'color',
      description: 'description',
      maxLevel: 'max_level',
      attackType: 'attack_type',
      projectileType: 'projectile_type',
      defaultTargeting: 'default_targeting',
    });
    if (!built) return false;

    built.values.push(id);
    const sql = `UPDATE tower_definitions SET ${built.fields.join(', ')} WHERE id = $${built.nextParam}`;
    const result = await query(sql, built.values);
    return (result.rowCount ?? 0) > 0;
  }

  // Update a tower level
  async updateTowerLevel(
    towerId: number,
    level: number,
    updates: Partial<TowerLevel>
  ): Promise<boolean> {
    const built = buildUpdateFields(updates, {
      cost: 'cost',
      damage: 'damage',
      range: 'range',
      fireRate: 'fire_rate',
      projectileSpeed: 'projectile_speed',
      splashRadius: 'splash_radius',
      splashChance: 'splash_chance',
      chainCount: 'chain_count',
      pierceCount: 'pierce_count',
      targetCount: 'target_count',
      statusEffect: 'status_effect',
      effectDuration: 'effect_duration',
      effectStrength: 'effect_strength',
      auraRadius: 'aura_radius',
      auraEffect: 'aura_effect',
      auraStrength: 'aura_strength',
    });
    if (!built) return false;

    built.values.push(towerId, level);
    const sql = `UPDATE tower_levels SET ${built.fields.join(', ')} WHERE tower_id = $${built.nextParam} AND level = $${built.nextParam + 1}`;
    const result = await query(sql, built.values);
    return (result.rowCount ?? 0) > 0;
  }

  // Create or update a tower level (upsert)
  async upsertTowerLevel(towerLevel: TowerLevel): Promise<boolean> {
    const result = await query(
      `INSERT INTO tower_levels (
        tower_id, level, cost, damage, range, fire_rate,
        projectile_speed, splash_radius, splash_chance,
        chain_count, pierce_count, target_count,
        status_effect, effect_duration, effect_strength,
        aura_radius, aura_effect, aura_strength
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (tower_id, level) DO UPDATE SET
         cost = EXCLUDED.cost,
         damage = EXCLUDED.damage,
         range = EXCLUDED.range,
         fire_rate = EXCLUDED.fire_rate,
         projectile_speed = EXCLUDED.projectile_speed,
         splash_radius = EXCLUDED.splash_radius,
         splash_chance = EXCLUDED.splash_chance,
         chain_count = EXCLUDED.chain_count,
         pierce_count = EXCLUDED.pierce_count,
         target_count = EXCLUDED.target_count,
         status_effect = EXCLUDED.status_effect,
         effect_duration = EXCLUDED.effect_duration,
         effect_strength = EXCLUDED.effect_strength,
         aura_radius = EXCLUDED.aura_radius,
         aura_effect = EXCLUDED.aura_effect,
         aura_strength = EXCLUDED.aura_strength`,
      [
        towerLevel.towerId,
        towerLevel.level,
        towerLevel.cost,
        towerLevel.damage,
        towerLevel.range,
        towerLevel.fireRate,
        towerLevel.projectileSpeed,
        towerLevel.splashRadius,
        towerLevel.splashChance,
        towerLevel.chainCount,
        towerLevel.pierceCount,
        towerLevel.targetCount,
        towerLevel.statusEffect,
        towerLevel.effectDuration,
        towerLevel.effectStrength,
        towerLevel.auraRadius,
        towerLevel.auraEffect,
        towerLevel.auraStrength,
      ]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Delete a tower level
  async deleteTowerLevel(towerId: number, level: number): Promise<boolean> {
    const result = await query('DELETE FROM tower_levels WHERE tower_id = $1 AND level = $2', [
      towerId,
      level,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  // Helper: Map database row to TowerDefinition
  private mapToTowerDefinition(row: TowerDefinitionRow): TowerDefinition {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
      maxLevel: row.max_level,
      attackType: row.attack_type as AttackType,
      projectileType: row.projectile_type as ProjectileType,
      defaultTargeting: row.default_targeting as TargetingMode,
    };
  }

  // Helper: Map database row to TowerLevel
  private mapToTowerLevel(row: TowerLevelRow): TowerLevel {
    return {
      id: row.id,
      towerId: row.tower_id,
      level: row.level,
      cost: row.cost,
      damage: row.damage,
      range: row.range,
      fireRate: parseFloat(row.fire_rate),
      projectileSpeed: row.projectile_speed,
      splashRadius: row.splash_radius,
      splashChance: row.splash_chance,
      chainCount: row.chain_count,
      pierceCount: row.pierce_count,
      targetCount: row.target_count,
      statusEffect: row.status_effect as StatusEffectType,
      effectDuration: row.effect_duration,
      effectStrength: row.effect_strength,
      auraRadius: row.aura_radius,
      auraEffect: row.aura_effect as AuraEffectType,
      auraStrength: row.aura_strength,
    };
  }
}
