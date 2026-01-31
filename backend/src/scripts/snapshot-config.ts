/**
 * Snapshot Config Script
 *
 * Fetches the current game configuration from the API and updates
 * the seed data in init.sql so it persists across DB rebuilds.
 *
 * Usage: docker-compose exec backend ts-node src/scripts/snapshot-config.ts
 *    or: npm run snapshot (from within the backend container)
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env['API_URL'] || 'http://localhost:3001';

interface TowerLevel {
  towerId: number;
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
}

interface TowerDefinition {
  id: number;
  name: string;
  color: string;
  description: string;
  maxLevel: number;
  levels: TowerLevel[];
}

interface EnemyDefinition {
  id: number;
  name: string;
  description: string;
  health: number;
  speed: number;
  reward: number;
  color: string;
  size: number;
}

interface WaveEnemy {
  enemyId: number;
  count: number;
  spawnDelayMs: number;
}

interface WaveComposition {
  waveNumber: number;
  enemies: WaveEnemy[];
}

interface GameSettings {
  id: number;
  mode: string;
  initialCoins: number;
  initialLives: number;
  towerCostMultiplier: number;
  enemyHealthMultiplier: number;
  enemySpeedMultiplier: number;
  enemyRewardMultiplier: number;
  enemyHealthWaveMultiplier: number;
  enemyRewardWaveMultiplier: number;
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`${endpoint} returned ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function generateTowerInserts(towers: TowerDefinition[]): string {
  const defRows = towers
    .map((t) => `    ('${t.name}', '${t.color}', '${t.description}', ${t.maxLevel})`)
    .join(',\n');

  const levelRows: string[] = [];
  for (const tower of towers) {
    for (const lvl of tower.levels) {
      levelRows.push(
        `    (${lvl.towerId}, ${lvl.level}, ${lvl.cost}, ${lvl.damage}, ${lvl.range}, ${lvl.fireRate.toFixed(2)})`
      );
    }
  }

  return [
    '-- Insert default tower definitions (metadata only)',
    'INSERT INTO tower_definitions (name, color, description, max_level)',
    'VALUES',
    defRows,
    'ON CONFLICT (name) DO NOTHING;',
    '',
    '-- Insert default tower levels (level 1 = base, level 2+ = upgrades)',
    'INSERT INTO tower_levels (tower_id, level, cost, damage, range, fire_rate)',
    'VALUES',
    levelRows.join(',\n'),
    'ON CONFLICT (tower_id, level) DO NOTHING;',
  ].join('\n');
}

function generateEnemyInserts(enemies: EnemyDefinition[]): string {
  const rows = enemies
    .map(
      (e) =>
        `    ('${e.name}', '${e.description}', ${e.health}, ${e.speed}, ${e.reward}, '${e.color}', ${e.size})`
    )
    .join(',\n');

  return [
    '-- Insert default enemy definitions',
    'INSERT INTO enemy_definitions (name, description, health, speed, reward, color, size)',
    'VALUES',
    rows,
    'ON CONFLICT (name) DO NOTHING;',
  ].join('\n');
}

function generateWaveInserts(waves: WaveComposition[]): string {
  const rows: string[] = [];

  for (const wave of waves) {
    for (const enemy of wave.enemies) {
      // Look up difficulty label from DB — not in API response, use placeholder based on wave number
      const label = getDifficultyLabel(wave.waveNumber);
      rows.push(
        `    (${wave.waveNumber}, ${enemy.enemyId}, ${enemy.count}, ${enemy.spawnDelayMs}, '${label}')`
      );
    }
  }

  return [
    '-- Insert default wave definitions',
    'INSERT INTO wave_definitions (wave_number, enemy_id, count, spawn_delay_ms, difficulty_label) VALUES',
    rows.join(',\n'),
    'ON CONFLICT (wave_number, enemy_id) DO NOTHING;',
  ].join('\n');
}

function getDifficultyLabel(waveNumber: number): string {
  if (waveNumber <= 2) return 'easy';
  if (waveNumber <= 4) return 'medium';
  if (waveNumber <= 8) return 'hard';
  return 'extreme';
}

function generateSettingsInserts(settings: GameSettings[]): string {
  const rows = settings
    .map(
      (s) =>
        `    ('${s.mode}', ${s.initialCoins}, ${s.initialLives}, ${s.towerCostMultiplier.toFixed(2)}, ${s.enemyHealthMultiplier.toFixed(2)}, ${s.enemySpeedMultiplier.toFixed(2)}, ${s.enemyRewardMultiplier.toFixed(2)}, ${s.enemyHealthWaveMultiplier.toFixed(3)}, ${s.enemyRewardWaveMultiplier.toFixed(3)})`
    )
    .join(',\n');

  return [
    '-- Insert default game settings presets',
    'INSERT INTO game_settings (mode, initial_coins, initial_lives, tower_cost_multiplier, enemy_health_multiplier, enemy_speed_multiplier, enemy_reward_multiplier, enemy_health_wave_multiplier, enemy_reward_wave_multiplier)',
    'VALUES',
    rows,
    "ON CONFLICT (mode) DO NOTHING;",
  ].join('\n');
}

async function main(): Promise<void> {
  console.log(`Fetching config from ${API_BASE}...`);

  const [towers, enemies, waves, settings] = await Promise.all([
    fetchJson<TowerDefinition[]>('/api/config/towers'),
    fetchJson<EnemyDefinition[]>('/api/config/enemies'),
    fetchJson<WaveComposition[]>('/api/config/waves'),
    fetchJson<GameSettings[]>('/api/config/settings'),
  ]);

  console.log(
    `Fetched: ${towers.length} towers, ${enemies.length} enemies, ${waves.length} waves, ${settings.length} settings`
  );

  const initSqlPath = path.join(__dirname, '..', 'database', 'init.sql');
  const content = fs.readFileSync(initSqlPath, 'utf-8');

  // Find the seed data section (starts after the last CREATE INDEX)
  const seedMarker = '-- Insert default tower definitions';
  const seedStart = content.indexOf(seedMarker);

  if (seedStart === -1) {
    console.error('Could not find seed data marker in init.sql');
    process.exit(1);
  }

  // Find the end of seed data (before triggers/functions section)
  const triggerMarker = '-- Function to update updated_at';
  const triggerStart = content.indexOf(triggerMarker);

  if (triggerStart === -1) {
    console.error('Could not find trigger marker in init.sql');
    process.exit(1);
  }

  const beforeSeed = content.substring(0, seedStart);
  const afterSeed = content.substring(triggerStart);

  const newSeed = [
    generateTowerInserts(towers),
    '',
    generateEnemyInserts(enemies),
    '',
    generateWaveInserts(waves),
    '',
    generateSettingsInserts(settings),
    '',
    '',
  ].join('\n');

  const newContent = beforeSeed + newSeed + afterSeed;

  fs.writeFileSync(initSqlPath, newContent, 'utf-8');
  console.log(`Updated ${initSqlPath}`);
  console.log('Seed data snapshot complete.');
}

main().catch((err) => {
  console.error('Snapshot failed:', err);
  process.exit(1);
});
