/**
 * Chess TDF Backend Integration Test Suite
 *
 * Tests all backend components: database, repositories, services, and API endpoints.
 * Run with: docker-compose exec backend npm test
 *
 * Structure:
 * - Database connectivity & schema
 * - Repository layer (CRUD operations)
 * - Service layer (business logic + error handling)
 * - Wave system (repository + service)
 * - API endpoints (HTTP integration, including error cases)
 *
 * Tests query actual DB values instead of hardcoding, so they stay valid
 * when game balance is tuned.
 */

import { testConnection, query } from '../database/db';
import { TowerRepository } from '../database/repositories/TowerRepository';
import { EnemyRepository } from '../database/repositories/EnemyRepository';
import { SettingsRepository } from '../database/repositories/SettingsRepository';
import { GameSessionRepository } from '../database/repositories/GameSessionRepository';
import { StatisticsRepository } from '../database/repositories/StatisticsRepository';
import { WaveRepository } from '../database/repositories/WaveRepository';
import { ConfigService } from '../services/ConfigService';
import { GameService } from '../services/GameService';
import { StatisticsService } from '../services/StatisticsService';
import { WaveService } from '../services/WaveService';
import type { GameSessionDB, GameStatistics } from '../types';

// Test configuration
const API_BASE = process.env['API_BASE'] || 'http://localhost:3001';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test result tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];
let currentSection = '';

// Helper functions
function log(message: string): void {
  console.log(message);
}

function section(name: string): void {
  currentSection = name;
  log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.cyan}${name}${colors.reset}`);
  log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name: `${currentSection}: ${name}`, passed: true, duration });
    log(`  ${colors.green}PASS${colors.reset} ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name: `${currentSection}: ${name}`, passed: false, error: errorMsg, duration });
    log(`  ${colors.red}FAIL${colors.reset} ${name} (${duration}ms)`);
    log(`       ${colors.red}${errorMsg}${colors.reset}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is ${value}`);
  }
}

function assertGreater(actual: number, min: number, message: string): void {
  if (actual <= min) {
    throw new Error(`${message}: expected > ${min}, got ${actual}`);
  }
}

function assertGreaterOrEqual(actual: number, min: number, message: string): void {
  if (actual < min) {
    throw new Error(`${message}: expected >= ${min}, got ${actual}`);
  }
}

// Fetch helper that also returns the HTTP status code
interface FetchResult<T> {
  status: number;
  data: T;
}

async function fetchWithStatus<T>(path: string, options?: RequestInit): Promise<FetchResult<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = (await response.json()) as T;
  return { status: response.status, data };
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await fetchWithStatus<T>(path, options);
  return data;
}

// Factory functions for duplicated test payloads
type SessionPayload = Omit<GameSessionDB, 'id' | 'startedAt' | 'lastUpdated'>;
type StatsPayload = Omit<GameStatistics, 'id' | 'createdAt' | 'settingsId'>;
type EndGameStats = Pick<
  GameStatistics,
  | 'duration'
  | 'enemiesKilledTotal'
  | 'enemiesKilledByType'
  | 'towersBuiltTotal'
  | 'towersBuiltByType'
  | 'coinsEarned'
  | 'coinsSpent'
  | 'damageDealt'
>;

function makeSessionPayload(
  gameId: string,
  overrides?: Partial<SessionPayload>
): SessionPayload {
  return {
    gameId,
    settingsId: 2,
    gameMode: '10waves',
    currentWave: 0,
    wavesCompleted: 0,
    coins: 200,
    lives: 10,
    towers: [],
    enemiesKilled: 0,
    coinsEarned: 0,
    coinsSpent: 0,
    damageDealt: 0,
    status: 'active',
    ...overrides,
  };
}

function makeEndGameStats(overrides?: Partial<EndGameStats>): EndGameStats {
  return {
    duration: 0,
    enemiesKilledTotal: 0,
    enemiesKilledByType: {},
    towersBuiltTotal: 0,
    towersBuiltByType: {},
    coinsEarned: 0,
    coinsSpent: 0,
    damageDealt: 0,
    ...overrides,
  };
}

function makeStatsPayload(
  gameId: string,
  overrides?: Partial<StatsPayload>
): StatsPayload {
  return {
    gameId,
    timestamp: new Date(),
    duration: 60000,
    outcome: 'win',
    gameMode: '10waves',
    finalWave: 10,
    wavesCompleted: 10,
    enemiesKilledTotal: 100,
    enemiesKilledByType: {},
    towersBuiltTotal: 5,
    towersBuiltByType: {},
    coinsEarned: 1000,
    coinsSpent: 800,
    damageDealt: 5000,
    ...overrides,
  };
}

// ============================================================
// DATABASE TESTS
// ============================================================
async function testDatabase(): Promise<void> {
  section('Database');

  await test('Connection test', async () => {
    const connected = await testConnection();
    assert(connected, 'Database connection failed');
  });

  await test('Query execution', async () => {
    const result = await query('SELECT 1 as num');
    assertEqual(result.rows[0]?.['num'], 1, 'Query result mismatch');
  });

  await test('Tables exist', async () => {
    const tables = [
      'tower_definitions',
      'tower_levels',
      'enemy_definitions',
      'game_settings',
      'game_sessions',
      'game_statistics',
      'wave_definitions',
    ];

    for (const table of tables) {
      const result = await query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      assert(result.rows[0]?.['exists'], `Table ${table} does not exist`);
    }
  });

  await test('Seed data present - towers', async () => {
    const result = await query('SELECT COUNT(*) as count FROM tower_definitions');
    assert(Number(result.rows[0]?.['count']) >= 3, 'Missing tower definitions');
  });

  await test('Seed data present - tower levels', async () => {
    const result = await query('SELECT COUNT(*) as count FROM tower_levels');
    assert(Number(result.rows[0]?.['count']) >= 10, 'Missing tower levels');
  });

  await test('Seed data present - enemies', async () => {
    const result = await query('SELECT COUNT(*) as count FROM enemy_definitions');
    assert(Number(result.rows[0]?.['count']) >= 6, 'Missing enemy definitions');
  });

  await test('Seed data present - settings', async () => {
    const result = await query('SELECT COUNT(*) as count FROM game_settings');
    assert(Number(result.rows[0]?.['count']) >= 3, 'Missing game settings');
  });

  await test('Seed data present - wave definitions', async () => {
    const result = await query('SELECT COUNT(*) as count FROM wave_definitions');
    assert(Number(result.rows[0]?.['count']) >= 1, 'Missing wave definitions');
  });
}

// ============================================================
// REPOSITORY TESTS
// ============================================================
async function testRepositories(): Promise<void> {
  section('Repositories');

  const towerRepo = new TowerRepository();
  const enemyRepo = new EnemyRepository();
  const settingsRepo = new SettingsRepository();
  const sessionRepo = new GameSessionRepository();
  const statsRepo = new StatisticsRepository();
  const waveRepo = new WaveRepository();

  // Tower Repository
  await test('TowerRepository.getAllTowerDefinitions', async () => {
    const towers = await towerRepo.getAllTowerDefinitions();
    assert(towers.length >= 3, 'Expected at least 3 tower definitions');
    const basic = towers.find((t) => t.id === 1);
    assertDefined(basic, 'Basic tower (id=1) not found');
    assertEqual(basic.name, 'Basic Tower', 'Basic tower name mismatch');
  });

  await test('TowerRepository.getTowerDefinition', async () => {
    const tower = await towerRepo.getTowerDefinition(2);
    assertDefined(tower, 'Sniper tower (id=2) not found');
    assertEqual(tower.name, 'Sniper Tower', 'Sniper tower name mismatch');
  });

  await test('TowerRepository.getTowerDefinition - nonexistent', async () => {
    const tower = await towerRepo.getTowerDefinition(999);
    assert(tower === null, 'Should return null for nonexistent tower');
  });

  await test('TowerRepository.getAllTowerLevels', async () => {
    const levels = await towerRepo.getAllTowerLevels();
    assert(levels.length >= 10, 'Expected at least 10 tower levels');
  });

  await test('TowerRepository.getTowerLevels', async () => {
    const levels = await towerRepo.getTowerLevels(1);
    assert(levels.length >= 3, 'Basic tower should have at least 3 levels');
    // Verify levels are sorted ascending
    for (let i = 1; i < levels.length; i++) {
      assert(
        (levels[i]?.level ?? 0) > (levels[i - 1]?.level ?? 0),
        'Levels should be sorted ascending'
      );
    }
  });

  await test('TowerRepository.getTowerLevel', async () => {
    const level = await towerRepo.getTowerLevel(1, 1);
    assertDefined(level, 'Basic tower level 1 not found');
    assertEqual(level.level, 1, 'Level number mismatch');
    assertGreater(level.cost, 0, 'Cost should be positive');
    assertGreater(level.damage, 0, 'Damage should be positive');
    assertGreater(level.range, 0, 'Range should be positive');
    assertGreater(level.fireRate, 0, 'Fire rate should be positive');
  });

  await test('TowerRepository.getMaxLevel', async () => {
    const maxLevel = await towerRepo.getMaxLevel(1);
    assertGreaterOrEqual(maxLevel, 3, 'Basic tower should have at least 3 levels');
  });

  // Enemy Repository
  await test('EnemyRepository.getAllEnemyDefinitions', async () => {
    const enemies = await enemyRepo.getAllEnemyDefinitions();
    assert(enemies.length >= 6, 'Expected at least 6 enemy definitions');
    const pawn = enemies.find((e) => e.id === 1);
    assertDefined(pawn, 'Pawn enemy (id=1) not found');
  });

  await test('EnemyRepository.getEnemyDefinition', async () => {
    const enemy = await enemyRepo.getEnemyDefinition(5);
    assertDefined(enemy, 'Queen enemy (id=5) not found');
    assertGreater(enemy.health, 0, 'Queen health should be positive');
    assertGreater(enemy.speed, 0, 'Queen speed should be positive');
  });

  await test('EnemyRepository.getEnemyDefinition - nonexistent', async () => {
    const enemy = await enemyRepo.getEnemyDefinition(999);
    assert(enemy === null, 'Should return null for nonexistent enemy');
  });

  // Settings Repository
  await test('SettingsRepository.getAllSettings', async () => {
    const settings = await settingsRepo.getAllSettings();
    assert(settings.length >= 3, 'Expected at least 3 settings presets');
  });

  await test('SettingsRepository.getSettingsByMode', async () => {
    const normal = await settingsRepo.getSettingsByMode('normal');
    assertDefined(normal, 'Normal settings not found');
    assertGreater(normal.initialCoins, 0, 'Normal initial coins should be positive');
    assertGreater(normal.initialLives, 0, 'Normal initial lives should be positive');
  });

  await test('SettingsRepository.getSettingsByMode - all modes', async () => {
    for (const mode of ['easy', 'normal', 'hard'] as const) {
      const settings = await settingsRepo.getSettingsByMode(mode);
      assertDefined(settings, `${mode} settings not found`);
    }
  });

  // Game Session Repository
  await test('GameSessionRepository.createGameSession', async () => {
    const session = await sessionRepo.createGameSession(makeSessionPayload('test-session-1'));
    assertEqual(session.gameId, 'test-session-1', 'Session ID mismatch');
    assertEqual(session.status, 'active', 'Session status should be active');
    // Cleanup
    await sessionRepo.deleteGameSession('test-session-1');
  });

  await test('GameSessionRepository.getGameSession', async () => {
    await sessionRepo.createGameSession(makeSessionPayload('test-session-2'));
    const session = await sessionRepo.getGameSession('test-session-2');
    assertDefined(session, 'Session not found');
    assertEqual(session.gameId, 'test-session-2', 'Session ID mismatch');
    // Cleanup
    await sessionRepo.deleteGameSession('test-session-2');
  });

  await test('GameSessionRepository.getGameSession - nonexistent', async () => {
    const session = await sessionRepo.getGameSession('nonexistent-id');
    assert(session === null || session === undefined, 'Should return null for nonexistent session');
  });

  await test('GameSessionRepository.updateGameSession', async () => {
    await sessionRepo.createGameSession(makeSessionPayload('test-session-3'));
    const updated = await sessionRepo.updateGameSession('test-session-3', {
      coins: 500,
      currentWave: 3,
    });
    assert(updated, 'Update should return true');
    const session = await sessionRepo.getGameSession('test-session-3');
    assertEqual(session?.coins, 500, 'Coins not updated');
    assertEqual(session?.currentWave, 3, 'Wave not updated');
    // Cleanup
    await sessionRepo.deleteGameSession('test-session-3');
  });

  // Statistics Repository
  await test('StatisticsRepository.createStatistics and getStatisticsByGameId', async () => {
    const stat = await statsRepo.createStatistics(
      makeStatsPayload('test-stat-1', {
        enemiesKilledByType: { pawn: 50, knight: 50 },
        towersBuiltByType: { basic: 3, sniper: 2 },
      })
    );
    assert(stat.id !== undefined && stat.id > 0, 'Statistics ID should be positive');

    const retrieved = await statsRepo.getStatisticsByGameId('test-stat-1');
    assertDefined(retrieved, 'Statistics not found');
    assertEqual(retrieved.outcome, 'win', 'Outcome mismatch');

    // Cleanup
    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-stat-1']);
  });

  // Wave Repository
  await test('WaveRepository.getWaveDefinitions', async () => {
    const definitions = await waveRepo.getWaveDefinitions(1);
    assert(definitions.length >= 1, 'Wave 1 should have at least 1 enemy type');
    const firstDef = definitions[0];
    assertDefined(firstDef, 'First wave definition should exist');
    assertGreater(firstDef.count, 0, 'Enemy count should be positive');
    assertGreater(firstDef.spawnDelayMs, 0, 'Spawn delay should be positive');
    assertGreater(firstDef.enemyId, 0, 'Enemy ID should be positive');
  });

  await test('WaveRepository.getMaxDefinedWave', async () => {
    const maxWave = await waveRepo.getMaxDefinedWave();
    assertGreaterOrEqual(maxWave, 1, 'Should have at least 1 defined wave');
  });

  await test('WaveRepository.getWaveDefinitions - beyond max uses highest', async () => {
    const maxWave = await waveRepo.getMaxDefinedWave();
    const beyondMax = await waveRepo.getWaveDefinitions(maxWave + 100);
    const atMax = await waveRepo.getWaveDefinitions(maxWave);
    assertEqual(beyondMax.length, atMax.length, 'Beyond-max wave should match max wave definition count');
  });
}

// ============================================================
// SERVICE TESTS
// ============================================================
async function testServices(): Promise<void> {
  section('Services');

  const configService = new ConfigService();
  const gameService = new GameService();
  const statsService = new StatisticsService();
  const waveService = new WaveService();

  // Fetch actual DB values for dynamic assertions
  const normalSettings = await configService.getSettingsByMode('normal');
  assertDefined(normalSettings, 'Normal settings required for service tests');
  const easySettings = await configService.getSettingsByMode('easy');
  assertDefined(easySettings, 'Easy settings required for service tests');
  const hardSettings = await configService.getSettingsByMode('hard');
  assertDefined(hardSettings, 'Hard settings required for service tests');

  const basicLevel1 = await configService.getTowerLevel(1, 1);
  assertDefined(basicLevel1, 'Basic tower level 1 required for service tests');

  // Config Service
  await test('ConfigService.getTowerDefinitionsWithLevels', async () => {
    const towers = await configService.getTowerDefinitionsWithLevels();
    assert(towers.length >= 3, 'Expected at least 3 towers with levels');
    const basic = towers.find((t) => t.id === 1);
    assertDefined(basic, 'Basic tower not found');
    assertGreaterOrEqual(basic.maxLevel, 3, 'Basic tower should have at least 3 levels');
    assertEqual(basic.levels.length, basic.maxLevel, 'Levels count should match maxLevel');
  });

  await test('ConfigService.getTowerDefinitionsWithLevels (single)', async () => {
    const towers = await configService.getTowerDefinitionsWithLevels(2);
    assertEqual(towers.length, 1, 'Should return single tower');
    assertEqual(towers[0]?.id, 2, 'Should return sniper tower');
  });

  await test('ConfigService.getTowerDefinitionsWithLevels (nonexistent)', async () => {
    const towers = await configService.getTowerDefinitionsWithLevels(999);
    assertEqual(towers.length, 0, 'Should return empty for nonexistent tower');
  });

  await test('ConfigService.getAllEnemyDefinitions', async () => {
    const enemies = await configService.getAllEnemyDefinitions();
    assert(enemies.length >= 6, 'Expected at least 6 enemies');
  });

  await test('ConfigService.getEnemyDefinition', async () => {
    const enemy = await configService.getEnemyDefinition(1);
    assertDefined(enemy, 'Pawn enemy not found');
    assertEqual(enemy.id, 1, 'Enemy ID mismatch');
  });

  await test('ConfigService.getSettingsByMode', async () => {
    const settings = await configService.getSettingsByMode('hard');
    assertDefined(settings, 'Hard settings not found');
    assertEqual(settings.mode, 'hard', 'Mode should be hard');
    assertGreater(settings.initialCoins, 0, 'Initial coins should be positive');
  });

  await test('ConfigService.getDefaultSettings', async () => {
    const settings = await configService.getDefaultSettings();
    assertDefined(settings, 'Default settings not found');
    assertEqual(settings.mode, 'normal', 'Default should be normal mode');
  });

  await test('ConfigService.getSettingsById', async () => {
    const allSettings = await configService.getAllSettings();
    assert(allSettings.length > 0, 'Should have settings');
    const firstId = allSettings[0]?.id;
    assertDefined(firstId, 'First settings should have an ID');
    const byId = await configService.getSettingsById(firstId);
    assertDefined(byId, 'Should find settings by ID');
  });

  // Game Service
  async function cleanupGame(gameId: string): Promise<void> {
    await gameService.startWave(gameId);
    await gameService.endGame(gameId, 'loss', makeEndGameStats());
  }

  await test('GameService.createGame', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    assertDefined(game, 'Game not created');
    assert(game.id.length > 0, 'Game ID should not be empty');
    assertEqual(game.coins, normalSettings.initialCoins, 'Initial coins should match normal settings');
    assertEqual(game.lives, normalSettings.initialLives, 'Initial lives should match normal settings');
    assertEqual(game.wave, 0, 'Initial wave should be 0');
    await cleanupGame(game.id);
  });

  await test('GameService.createGame - easy mode', async () => {
    const game = await gameService.createGame('10waves', 'easy');
    assertEqual(game.coins, easySettings.initialCoins, 'Easy mode initial coins mismatch');
    assertEqual(game.lives, easySettings.initialLives, 'Easy mode initial lives mismatch');
    await cleanupGame(game.id);
  });

  await test('GameService.getGame', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const retrieved = await gameService.getGame(game.id);
    assertDefined(retrieved, 'Should retrieve game');
    assertEqual(retrieved.id, game.id, 'Game ID should match');
    assertEqual(retrieved.coins, game.coins, 'Coins should match');
    await cleanupGame(game.id);
  });

  await test('GameService.getGame - nonexistent', async () => {
    const game = await gameService.getGame('nonexistent-id');
    assert(game === undefined, 'Should return undefined for nonexistent game');
  });

  await test('GameService.buildTower', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const result = await gameService.buildTower(game.id, {
      towerId: 1,
      gridX: 5,
      gridY: 3,
    });
    assert(result.success, 'Tower build should succeed');
    assertDefined(result.tower, 'Tower should be returned');
    assertEqual(result.tower.towerId, 1, 'Tower type mismatch');
    assertEqual(result.tower.level, 1, 'Tower level should be 1');
    assertEqual(
      result.remainingCoins,
      normalSettings.initialCoins - basicLevel1.cost,
      'Remaining coins mismatch'
    );
    await cleanupGame(game.id);
  });

  await test('GameService.buildTower - insufficient coins', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    // Build towers until we can't afford another
    let coins = normalSettings.initialCoins;
    let gridX = 0;
    while (coins >= basicLevel1.cost && gridX < 20) {
      await gameService.buildTower(game.id, { towerId: 1, gridX, gridY: 0 });
      coins -= basicLevel1.cost;
      gridX++;
    }
    // Now try to build when we can't afford it
    const result = await gameService.buildTower(game.id, { towerId: 1, gridX: 19, gridY: 9 });
    assert(!result.success, 'Should fail with insufficient coins');
    assert(result.message?.includes('Insufficient') ?? false, 'Should mention insufficient coins');
    await cleanupGame(game.id);
  });

  await test('GameService.buildTower - position occupied', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    await gameService.buildTower(game.id, { towerId: 1, gridX: 5, gridY: 3 });
    const result = await gameService.buildTower(game.id, { towerId: 1, gridX: 5, gridY: 3 });
    assert(!result.success, 'Should fail on occupied position');
    assert(result.message?.includes('occupied') ?? false, 'Should mention occupied');
    await cleanupGame(game.id);
  });

  await test('GameService.buildTower - invalid game', async () => {
    const result = await gameService.buildTower('nonexistent', { towerId: 1, gridX: 0, gridY: 0 });
    assert(!result.success, 'Should fail for nonexistent game');
  });

  await test('GameService.upgradeTower', async () => {
    const game = await gameService.createGame('10waves', 'easy');
    const buildResult = await gameService.buildTower(game.id, {
      towerId: 1,
      gridX: 5,
      gridY: 3,
    });
    assertDefined(buildResult.tower, 'Tower should be built');

    const upgradeResult = await gameService.upgradeTower(game.id, buildResult.tower.id);
    assert(upgradeResult.success, 'Upgrade should succeed');
    assertDefined(upgradeResult.tower, 'Upgraded tower should be returned');
    assertEqual(upgradeResult.tower.level, 2, 'Tower level should be 2');
    await cleanupGame(game.id);
  });

  await test('GameService.upgradeTower - tower not found', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const result = await gameService.upgradeTower(game.id, 'fake-tower-id');
    assert(!result.success, 'Should fail for nonexistent tower');
    assert(result.message?.includes('not found') ?? false, 'Should mention not found');
    await cleanupGame(game.id);
  });

  await test('GameService.sellTower', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const buildResult = await gameService.buildTower(game.id, {
      towerId: 1,
      gridX: 5,
      gridY: 3,
    });
    assertDefined(buildResult.tower, 'Tower should be built');

    const sellResult = await gameService.sellTower(game.id, buildResult.tower.id);
    assert(sellResult.success, 'Sell should succeed');
    assertDefined(sellResult.refundAmount, 'Refund amount should be defined');
    // Refund is 70% of total invested (level 1 cost only)
    const expectedRefund = Math.floor(basicLevel1.cost * 0.7);
    assertEqual(sellResult.refundAmount, expectedRefund, 'Refund should be 70% of cost');
    assertEqual(
      sellResult.remainingCoins,
      normalSettings.initialCoins - basicLevel1.cost + expectedRefund,
      'Remaining coins mismatch'
    );
    await cleanupGame(game.id);
  });

  await test('GameService.sellTower - tower not found', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const result = await gameService.sellTower(game.id, 'fake-tower-id');
    assert(!result.success, 'Should fail for nonexistent tower');
    await cleanupGame(game.id);
  });

  await test('GameService.startWave', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const success = await gameService.startWave(game.id);
    assert(success, 'Start wave should succeed');
    const updatedGame = await gameService.getGame(game.id);
    assertEqual(updatedGame?.wave, 1, 'Wave should be 1');
    // Cleanup - already at wave 1
    await gameService.endGame(game.id, 'loss', makeEndGameStats());
  });

  await test('GameService.startWave - nonexistent game', async () => {
    const success = await gameService.startWave('nonexistent');
    assert(!success, 'Should fail for nonexistent game');
  });

  await test('GameService.completeWave', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    await gameService.startWave(game.id);
    const success = await gameService.completeWave(game.id);
    assert(success, 'Complete wave should succeed');
    await gameService.endGame(game.id, 'loss', makeEndGameStats());
  });

  await test('GameService.addCoins', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const success = await gameService.addCoins(game.id, 50);
    assert(success, 'Add coins should succeed');
    const updated = await gameService.getGame(game.id);
    assertEqual(
      updated?.coins,
      normalSettings.initialCoins + 50,
      'Coins should increase by 50'
    );
    await cleanupGame(game.id);
  });

  await test('GameService.addCoins - nonexistent game', async () => {
    const success = await gameService.addCoins('nonexistent', 50);
    assert(!success, 'Should fail for nonexistent game');
  });

  await test('GameService.loseLife', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const stillAlive = await gameService.loseLife(game.id);
    assert(stillAlive, 'Should still be alive after losing 1 life');
    const updated = await gameService.getGame(game.id);
    assertEqual(
      updated?.lives,
      normalSettings.initialLives - 1,
      'Lives should decrease by 1'
    );
    await cleanupGame(game.id);
  });

  await test('GameService.loseLife - game over', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    // Lose all lives
    for (let i = 0; i < normalSettings.initialLives; i++) {
      await gameService.loseLife(game.id);
    }
    const updated = await gameService.getGame(game.id);
    assertEqual(updated?.lives, 0, 'Lives should be 0');
    await cleanupGame(game.id);
  });

  await test('GameService.endGame records statistics', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    await gameService.startWave(game.id);
    const success = await gameService.endGame(
      game.id,
      'win',
      makeEndGameStats({
        duration: 60000,
        enemiesKilledTotal: 50,
        enemiesKilledByType: { '1': 30, '2': 20 },
        towersBuiltTotal: 3,
        towersBuiltByType: { '1': 2, '2': 1 },
        coinsEarned: 500,
        coinsSpent: 300,
        damageDealt: 2000,
      })
    );
    assert(success, 'End game should succeed');
    // Verify game session is deleted
    const deleted = await gameService.getGame(game.id);
    assert(deleted === undefined, 'Game session should be deleted after ending');
    // Cleanup statistics
    await query('DELETE FROM game_statistics WHERE game_id = $1', [game.id]);
  });

  // Wave Service
  await test('WaveService.getWaveEnemies', async () => {
    const enemies = await waveService.getWaveEnemies(1);
    assert(enemies.length > 0, 'Wave 1 should have enemies');
    for (const enemy of enemies) {
      assertGreater(enemy.enemyId, 0, 'Enemy ID should be positive');
      assertGreaterOrEqual(enemy.spawnDelay, 0, 'Spawn delay should be non-negative');
    }
    // Verify spawn delays are non-decreasing
    for (let i = 1; i < enemies.length; i++) {
      assert(
        (enemies[i]?.spawnDelay ?? 0) >= (enemies[i - 1]?.spawnDelay ?? 0),
        'Spawn delays should be non-decreasing'
      );
    }
  });

  await test('WaveService.getWaveInfo', async () => {
    const info = await waveService.getWaveInfo(1);
    assertGreater(info.enemyCount, 0, 'Enemy count should be positive');
    assert(info.difficulty.length > 0, 'Difficulty label should not be empty');
  });

  // Statistics Service
  await test('StatisticsService.recordGameStatistics', async () => {
    const stat = await statsService.recordGameStatistics(
      makeStatsPayload('test-svc-stat-1', {
        duration: 120000,
        outcome: 'loss',
        gameMode: '20waves',
        finalWave: 15,
        wavesCompleted: 14,
        enemiesKilledTotal: 200,
        enemiesKilledByType: { pawn: 100, rook: 100 },
        towersBuiltTotal: 8,
        towersBuiltByType: { basic: 5, rapid: 3 },
        coinsEarned: 2000,
        coinsSpent: 1500,
        damageDealt: 10000,
      })
    );
    assert(stat.id !== undefined && stat.id > 0, 'Statistics should be created');
    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-svc-stat-1']);
  });

  await test('StatisticsService.getStatisticsSummary', async () => {
    // Create test data
    await statsService.recordGameStatistics(makeStatsPayload('test-summary-1'));

    const summary = await statsService.getStatisticsSummary();
    assert(summary.totalGames >= 1, 'Should have at least 1 game');
    assert(summary.wins >= 1, 'Should have at least 1 win');

    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-summary-1']);
  });

  await test('StatisticsService.getStatisticsByOutcome', async () => {
    await statsService.recordGameStatistics(
      makeStatsPayload('test-outcome-1', {
        enemiesKilledTotal: 50,
        towersBuiltTotal: 3,
        coinsEarned: 500,
        coinsSpent: 300,
        damageDealt: 2000,
      })
    );

    const wins = await statsService.getStatisticsByOutcome('win', 10);
    assert(wins.length >= 1, 'Should have at least 1 win');
    for (const stat of wins) {
      assertEqual(stat.outcome, 'win', 'All results should be wins');
    }

    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-outcome-1']);
  });

  await test('StatisticsService.getStatisticsByGameMode', async () => {
    await statsService.recordGameStatistics(
      makeStatsPayload('test-mode-1', {
        outcome: 'loss',
        gameMode: '20waves',
        finalWave: 5,
        wavesCompleted: 4,
        enemiesKilledTotal: 30,
        towersBuiltTotal: 2,
        coinsEarned: 200,
        coinsSpent: 150,
        damageDealt: 1000,
      })
    );

    const results = await statsService.getStatisticsByGameMode('20waves', 10);
    assert(results.length >= 1, 'Should have at least 1 game in 20waves mode');

    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-mode-1']);
  });

  await test('StatisticsService.cleanupOldStatistics - rejects < 30 days', async () => {
    let threw = false;
    try {
      await statsService.cleanupOldStatistics(10);
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw for daysOld < 30');
  });
}

// ============================================================
// API ENDPOINT TESTS
// ============================================================
async function testApiEndpoints(): Promise<void> {
  section('API Endpoints');

  // Fetch actual values for dynamic assertions
  const configService = new ConfigService();
  const normalSettings = await configService.getSettingsByMode('normal');
  assertDefined(normalSettings, 'Normal settings required for API tests');
  const basicLevel1 = await configService.getTowerLevel(1, 1);
  assertDefined(basicLevel1, 'Basic tower level 1 required for API tests');
  const basicTower = await configService.getTowerDefinitionsWithLevels(1);
  assertDefined(basicTower[0], 'Basic tower required for API tests');

  // ---- Health ----
  await test('GET /health', async () => {
    const { status, data } = await fetchWithStatus<{
      status: string;
      timestamp: string;
      services: { database: { status: string; latency: number } };
    }>('/health');
    assertEqual(status, 200, 'Health should return 200');
    assertEqual(data.status, 'healthy', 'Health status should be healthy');
    assert(data.timestamp.length > 0, 'Timestamp should not be empty');
    assertEqual(data.services.database.status, 'connected', 'Database should be connected');
    assert(data.services.database.latency >= 0, 'Database latency should be non-negative');
  });

  // ---- Config - Towers ----
  await test('GET /api/config/towers', async () => {
    const { status, data: towers } = await fetchWithStatus<
      Array<{ id: number; name: string; levels: unknown[] }>
    >('/api/config/towers');
    assertEqual(status, 200, 'Should return 200');
    assert(towers.length >= 3, 'Expected at least 3 towers');
    const basic = towers.find((t) => t.id === 1);
    assertDefined(basic, 'Basic tower (id=1) not found');
    assert(basic.levels.length >= 3, 'Basic tower should have at least 3 levels');
  });

  await test('GET /api/config/towers?id=1', async () => {
    const { status, data: tower } = await fetchWithStatus<{ id: number; name: string }>(
      '/api/config/towers?id=1'
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(tower.id, 1, 'Should return basic tower (id=1)');
  });

  await test('GET /api/config/towers?id=999 (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/config/towers?id=999');
    assertEqual(status, 404, 'Should return 404 for nonexistent tower');
  });

  await test('GET /api/config/towers?id=abc (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/config/towers?id=abc');
    assertEqual(status, 400, 'Should return 400 for invalid ID');
  });

  await test('GET /api/config/towers/:towerId/levels', async () => {
    const { status, data: levels } = await fetchWithStatus<Array<{ level: number }>>(
      '/api/config/towers/1/levels'
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(levels.length, basicTower[0]?.maxLevel ?? 0, 'Should have correct number of levels');
  });

  await test('GET /api/config/towers/:towerId/levels/:level', async () => {
    const { status, data: level } = await fetchWithStatus<{ level: number; cost: number }>(
      '/api/config/towers/1/levels/1'
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(level.level, 1, 'Level should be 1');
    assertEqual(level.cost, basicLevel1.cost, 'Cost should match DB value');
  });

  await test('GET /api/config/towers/:towerId/levels/:level (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/config/towers/1/levels/99');
    assertEqual(status, 404, 'Should return 404 for nonexistent level');
  });

  // ---- Config - Enemies ----
  await test('GET /api/config/enemies', async () => {
    const { status, data: enemies } = await fetchWithStatus<Array<{ id: number }>>(
      '/api/config/enemies'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(enemies.length >= 6, 'Expected at least 6 enemies');
  });

  await test('GET /api/config/enemies/:id', async () => {
    const { status, data: enemy } = await fetchWithStatus<{ id: number; health: number }>(
      '/api/config/enemies/5'
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(enemy.id, 5, 'Should return queen (id=5)');
    assertGreater(enemy.health, 0, 'Queen health should be positive');
  });

  await test('GET /api/config/enemies/:id (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/config/enemies/999');
    assertEqual(status, 404, 'Should return 404 for nonexistent enemy');
  });

  await test('GET /api/config/enemies/:id (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/config/enemies/abc');
    assertEqual(status, 400, 'Should return 400 for invalid enemy ID');
  });

  // ---- Config - Settings ----
  await test('GET /api/config/settings', async () => {
    const { status, data: settings } = await fetchWithStatus<Array<{ mode: string }>>(
      '/api/config/settings'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(settings.length >= 3, 'Expected at least 3 settings');
  });

  await test('GET /api/config/settings/:mode', async () => {
    const { status, data: settings } = await fetchWithStatus<{
      mode: string;
      initialCoins: number;
    }>('/api/config/settings/normal');
    assertEqual(status, 200, 'Should return 200');
    assertEqual(settings.mode, 'normal', 'Mode should be normal');
    assertEqual(settings.initialCoins, normalSettings.initialCoins, 'Initial coins should match DB');
  });

  await test('GET /api/config/settings/:mode (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/config/settings/superhard'
    );
    assertEqual(status, 400, 'Should return 400 for invalid mode');
  });

  await test('GET /api/config/settings/default', async () => {
    const { status, data: settings } = await fetchWithStatus<{ mode: string }>(
      '/api/config/settings/default'
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(settings.mode, 'normal', 'Default mode should be normal');
  });

  await test('GET /api/config/settings/id/:id', async () => {
    assertDefined(normalSettings.id, 'Normal settings should have an ID');
    const { status, data } = await fetchWithStatus<{ mode: string }>(
      `/api/config/settings/id/${normalSettings.id}`
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(data.mode, 'normal', 'Should return normal settings');
  });

  // ---- Game Lifecycle ----
  await test('POST /api/game/start', async () => {
    const { status, data: response } = await fetchWithStatus<{
      gameId: string;
      initialCoins: number;
      lives: number;
    }>('/api/game/start', {
      method: 'POST',
      body: JSON.stringify({ difficulty: 'normal', gameMode: '10waves' }),
    });
    assertEqual(status, 201, 'Should return 201');
    assert(response.gameId.length > 0, 'Game ID should not be empty');
    assertEqual(response.initialCoins, normalSettings.initialCoins, 'Initial coins should match DB');
    assertEqual(response.lives, normalSettings.initialLives, 'Lives should match DB');
    // Cleanup
    await fetchJson(`/api/game/${response.gameId}/end`, {
      method: 'POST',
      body: JSON.stringify({ finalWave: 0, enemiesKilled: 0 }),
    });
  });

  await test('GET /api/game/config', async () => {
    const { status, data: config } = await fetchWithStatus<{
      towers: unknown[];
      enemies: unknown[];
    }>('/api/game/config');
    assertEqual(status, 200, 'Should return 200');
    assert(config.towers.length >= 3, 'Expected at least 3 towers');
    assert(config.enemies.length >= 6, 'Expected at least 6 enemies');
  });

  // Create a game for tower/wave/state tests
  const gameResponse = await fetchJson<{ gameId: string }>('/api/game/start', {
    method: 'POST',
    body: JSON.stringify({ difficulty: 'normal', gameMode: '10waves' }),
  });
  const testGameId = gameResponse.gameId;

  await test('POST /api/game/:gameId/tower (build)', async () => {
    const { status, data: response } = await fetchWithStatus<{
      success: boolean;
      tower: { towerId: number; level: number };
      remainingCoins: number;
    }>(`/api/game/${testGameId}/tower`, {
      method: 'POST',
      body: JSON.stringify({ towerId: 1, gridX: 5, gridY: 3 }),
    });
    assertEqual(status, 201, 'Should return 201');
    assert(response.success, 'Tower build should succeed');
    assertEqual(response.tower.towerId, 1, 'Tower type should be basic (id=1)');
    assertEqual(
      response.remainingCoins,
      normalSettings.initialCoins - basicLevel1.cost,
      'Remaining coins mismatch'
    );
  });

  await test('POST /api/game/:gameId/tower (occupied position)', async () => {
    const { status, data } = await fetchWithStatus<{ error: string }>(
      `/api/game/${testGameId}/tower`,
      {
        method: 'POST',
        body: JSON.stringify({ towerId: 1, gridX: 5, gridY: 3 }),
      }
    );
    assertEqual(status, 400, 'Should return 400 for occupied position');
    assert(data.error !== undefined, 'Should return error message');
  });

  await test('GET /api/game/:gameId/state', async () => {
    const { status, data: state } = await fetchWithStatus<{
      coins: number;
      lives: number;
      wave: number;
      towers: unknown[];
    }>(`/api/game/${testGameId}/state`);
    assertEqual(status, 200, 'Should return 200');
    assertEqual(
      state.coins,
      normalSettings.initialCoins - basicLevel1.cost,
      'Coins should reflect tower purchase'
    );
    assertEqual(state.lives, normalSettings.initialLives, 'Lives should match');
    assertEqual(state.wave, 0, 'Wave should be 0');
    assert(state.towers.length >= 1, 'Should have at least 1 tower');
  });

  await test('GET /api/game/:gameId/state (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/game/nonexistent-game-id/state'
    );
    assertEqual(status, 404, 'Should return 404 for nonexistent game');
  });

  // Get the tower ID from state for upgrade/sell tests
  const stateForTower = await fetchJson<{ towers: Array<{ id: string }> }>(
    `/api/game/${testGameId}/state`
  );
  const builtTowerId = stateForTower.towers[0]?.id;

  await test('POST /api/game/:gameId/tower/:towerId/upgrade', async () => {
    assertDefined(builtTowerId, 'Need a tower ID for upgrade test');
    const { status, data } = await fetchWithStatus<{
      success: boolean;
      tower: { level: number };
      remainingCoins: number;
    }>(`/api/game/${testGameId}/tower/${builtTowerId}/upgrade`, { method: 'POST' });
    assertEqual(status, 200, 'Should return 200');
    assert(data.success, 'Upgrade should succeed');
    assertEqual(data.tower.level, 2, 'Tower should be level 2 after upgrade');
  });

  await test('POST /api/game/:gameId/tower/:towerId/upgrade (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      `/api/game/${testGameId}/tower/fake-tower-id/upgrade`,
      { method: 'POST' }
    );
    assertEqual(status, 400, 'Should return 400 for nonexistent tower');
  });

  await test('DELETE /api/game/:gameId/tower/:towerId (sell)', async () => {
    assertDefined(builtTowerId, 'Need a tower ID for sell test');
    const { status, data } = await fetchWithStatus<{
      success: boolean;
      refundAmount: number;
      remainingCoins: number;
    }>(`/api/game/${testGameId}/tower/${builtTowerId}`, { method: 'DELETE' });
    assertEqual(status, 200, 'Should return 200');
    assert(data.success, 'Sell should succeed');
    assertGreater(data.refundAmount, 0, 'Refund should be positive');
    assertGreater(data.remainingCoins, 0, 'Remaining coins should be positive');
  });

  await test('DELETE /api/game/:gameId/tower/:towerId (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      `/api/game/${testGameId}/tower/fake-tower-id`,
      { method: 'DELETE' }
    );
    assertEqual(status, 400, 'Should return 400 for nonexistent tower');
  });

  // Coins and lives endpoints
  await test('POST /api/game/:gameId/coins', async () => {
    const { status, data } = await fetchWithStatus<{ success: boolean; coins: number }>(
      `/api/game/${testGameId}/coins`,
      {
        method: 'POST',
        body: JSON.stringify({ amount: 100 }),
      }
    );
    assertEqual(status, 200, 'Should return 200');
    assert(data.success, 'Add coins should succeed');
    assertGreater(data.coins, 0, 'Coins should be positive');
  });

  await test('POST /api/game/:gameId/coins (invalid amount)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      `/api/game/${testGameId}/coins`,
      {
        method: 'POST',
        body: JSON.stringify({ amount: -10 }),
      }
    );
    assertEqual(status, 400, 'Should return 400 for negative amount');
  });

  await test('POST /api/game/:gameId/coins (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/game/nonexistent-game-id/coins',
      {
        method: 'POST',
        body: JSON.stringify({ amount: 10 }),
      }
    );
    assertEqual(status, 404, 'Should return 404 for nonexistent game');
  });

  await test('POST /api/game/:gameId/life/lose', async () => {
    const { status, data } = await fetchWithStatus<{
      success: boolean;
      lives: number;
      gameOver: boolean;
    }>(`/api/game/${testGameId}/life/lose`, { method: 'POST' });
    assertEqual(status, 200, 'Should return 200');
    assert(data.success, 'Lose life should succeed');
    assertEqual(data.lives, normalSettings.initialLives - 1, 'Lives should decrease by 1');
    assert(!data.gameOver, 'Should not be game over yet');
  });

  await test('POST /api/game/:gameId/wave', async () => {
    const { status, data: response } = await fetchWithStatus<{
      waveNumber: number;
      enemies: unknown[];
      enemyHealthWaveMultiplier: number;
      enemyRewardWaveMultiplier: number;
    }>(`/api/game/${testGameId}/wave`, { method: 'POST' });
    assertEqual(status, 200, 'Should return 200');
    assertEqual(response.waveNumber, 1, 'Wave should be 1');
    assert(response.enemies.length > 0, 'Should have enemies');
    assert(typeof response.enemyHealthWaveMultiplier === 'number', 'Should have health multiplier');
    assert(typeof response.enemyRewardWaveMultiplier === 'number', 'Should have reward multiplier');
  });

  await test('POST /api/game/:gameId/end', async () => {
    const { status, data: response } = await fetchWithStatus<{ success: boolean }>(
      `/api/game/${testGameId}/end`,
      {
        method: 'POST',
        body: JSON.stringify({ finalWave: 1, enemiesKilled: 5 }),
      }
    );
    assertEqual(status, 200, 'Should return 200');
    assert(response.success, 'End game should succeed');
  });

  // ---- Statistics ----
  // Create test statistics for filter tests
  const testStatGameId = 'api-test-stat-' + Date.now();
  await fetchJson('/api/statistics', {
    method: 'POST',
    body: JSON.stringify(
      makeStatsPayload(testStatGameId, {
        enemiesKilledByType: { '1': 50, '2': 50 },
        towersBuiltByType: { '1': 3, '2': 2 },
      })
    ),
  });

  await test('GET /api/statistics/summary', async () => {
    const { status, data: summary } = await fetchWithStatus<{ totalGames: number }>(
      '/api/statistics/summary'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(typeof summary.totalGames === 'number', 'totalGames should be a number');
  });

  await test('GET /api/statistics/recent', async () => {
    const { status, data: recent } = await fetchWithStatus<unknown[]>('/api/statistics/recent');
    assertEqual(status, 200, 'Should return 200');
    assert(Array.isArray(recent), 'Recent should be an array');
  });

  await test('GET /api/statistics/top-scores', async () => {
    const { status, data: topScores } = await fetchWithStatus<unknown[]>(
      '/api/statistics/top-scores'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(Array.isArray(topScores), 'Top scores should be an array');
  });

  await test('GET /api/statistics (paginated)', async () => {
    const { status, data } = await fetchWithStatus<{
      statistics: unknown[];
      total: number;
    }>('/api/statistics?limit=5&offset=0');
    assertEqual(status, 200, 'Should return 200');
    assert(Array.isArray(data.statistics), 'Statistics should be an array');
    assert(data.statistics.length <= 5, 'Should respect limit');
  });

  await test('GET /api/statistics/game/:gameId', async () => {
    const { status, data } = await fetchWithStatus<{ gameId: string }>(
      `/api/statistics/game/${testStatGameId}`
    );
    assertEqual(status, 200, 'Should return 200');
    assertEqual(data.gameId, testStatGameId, 'Game ID should match');
  });

  await test('GET /api/statistics/game/:gameId (not found)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/statistics/game/nonexistent-game-id'
    );
    assertEqual(status, 404, 'Should return 404 for nonexistent game');
  });

  await test('GET /api/statistics/outcome/:outcome', async () => {
    const { status, data } = await fetchWithStatus<Array<{ outcome: string }>>(
      '/api/statistics/outcome/win'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(Array.isArray(data), 'Should return array');
  });

  await test('GET /api/statistics/outcome/:outcome (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/statistics/outcome/draw'
    );
    assertEqual(status, 400, 'Should return 400 for invalid outcome');
  });

  await test('GET /api/statistics/mode/:gameMode', async () => {
    const { status, data } = await fetchWithStatus<Array<{ gameMode: string }>>(
      '/api/statistics/mode/10waves'
    );
    assertEqual(status, 200, 'Should return 200');
    assert(Array.isArray(data), 'Should return array');
  });

  await test('GET /api/statistics/mode/:gameMode (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/statistics/mode/50waves'
    );
    assertEqual(status, 400, 'Should return 400 for invalid game mode');
  });

  await test('POST /api/statistics (record)', async () => {
    const recordId = 'api-test-record-' + Date.now();
    const { status, data } = await fetchWithStatus<{ id: number; gameId: string }>(
      '/api/statistics',
      {
        method: 'POST',
        body: JSON.stringify(
          makeStatsPayload(recordId, {
            duration: 30000,
            outcome: 'loss',
            finalWave: 3,
            wavesCompleted: 2,
            enemiesKilledTotal: 20,
            towersBuiltTotal: 2,
            coinsEarned: 200,
            coinsSpent: 100,
            damageDealt: 500,
          })
        ),
      }
    );
    assertEqual(status, 201, 'Should return 201');
    assertGreater(data.id, 0, 'Should return positive ID');
    // Cleanup
    await query('DELETE FROM game_statistics WHERE game_id = $1', [recordId]);
  });

  await test('POST /api/statistics (missing fields)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>('/api/statistics', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'x' }),
    });
    assertEqual(status, 400, 'Should return 400 for missing required fields');
  });

  await test('DELETE /api/statistics/cleanup/:days (invalid)', async () => {
    const { status } = await fetchWithStatus<{ error: string }>(
      '/api/statistics/cleanup/5',
      { method: 'DELETE' }
    );
    assertEqual(status, 400, 'Should return 400 for days < 30');
  });

  // Cleanup test statistics
  await query('DELETE FROM game_statistics WHERE game_id = $1', [testStatGameId]);
}

// ============================================================
// MAIN
// ============================================================
async function runTests(): Promise<void> {
  log(`${colors.blue}Chess TDF Backend Test Suite${colors.reset}`);
  log(`${colors.blue}Started at: ${new Date().toISOString()}${colors.reset}`);
  log(`${colors.blue}API Base: ${API_BASE}${colors.reset}`);

  const startTime = Date.now();

  try {
    await testDatabase();
    await testRepositories();
    await testServices();
    await testApiEndpoints();
  } catch (error) {
    log(`\n${colors.red}Fatal error: ${error}${colors.reset}`);
  }

  const totalTime = Date.now() - startTime;

  // Summary
  log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.cyan}TEST SUMMARY${colors.reset}`);
  log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  log(
    `Total: ${total} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`
  );
  log(`Duration: ${totalTime}ms`);

  if (failed > 0) {
    log(`\n${colors.red}FAILED TESTS:${colors.reset}`);
    for (const result of results.filter((r) => !r.passed)) {
      log(`  ${colors.red}- ${result.name}${colors.reset}`);
      if (result.error) {
        log(`    ${colors.yellow}${result.error}${colors.reset}`);
      }
    }
  }

  log(`\n${colors.blue}Finished at: ${new Date().toISOString()}${colors.reset}`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);
