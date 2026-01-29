/**
 * Chess TDF Backend Integration Test Suite
 *
 * Tests all backend components: database, repositories, services, and API endpoints.
 * Run with: docker-compose exec backend npx ts-node src/tests/backend-test.ts
 *
 * Structure:
 * - Database connectivity
 * - Repository layer (CRUD operations)
 * - Service layer (business logic)
 * - API endpoints (HTTP integration)
 *
 * Each test section cleans up its own data.
 */

import { testConnection, query } from '../database/db';
import { TowerRepository } from '../database/repositories/TowerRepository';
import { EnemyRepository } from '../database/repositories/EnemyRepository';
import { SettingsRepository } from '../database/repositories/SettingsRepository';
import { GameSessionRepository } from '../database/repositories/GameSessionRepository';
import { StatisticsRepository } from '../database/repositories/StatisticsRepository';
import { ConfigService } from '../services/ConfigService';
import { GameService } from '../services/GameService';
import { StatisticsService } from '../services/StatisticsService';

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
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is ${value}`);
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return response.json() as Promise<T>;
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

  // Tower Repository
  await test('TowerRepository.getAllTowerDefinitions', async () => {
    const towers = await towerRepo.getAllTowerDefinitions();
    assert(towers.length >= 3, 'Expected at least 3 tower definitions');
    const basic = towers.find((t) => t.id === 1);
    assertDefined(basic, 'Basic tower not found');
    assertEqual(basic.name, 'Basic Tower', 'Basic tower name mismatch');
  });

  await test('TowerRepository.getTowerDefinition', async () => {
    const tower = await towerRepo.getTowerDefinition(2);
    assertDefined(tower, 'Sniper tower not found');
    assertEqual(tower.name, 'Sniper Tower', 'Sniper tower name mismatch');
  });

  await test('TowerRepository.getAllTowerLevels', async () => {
    const levels = await towerRepo.getAllTowerLevels();
    assert(levels.length >= 10, 'Expected at least 10 tower levels');
  });

  await test('TowerRepository.getTowerLevels', async () => {
    const levels = await towerRepo.getTowerLevels(1);
    assertEqual(levels.length, 5, 'Basic tower should have 5 levels');
  });

  await test('TowerRepository.getTowerLevel', async () => {
    const level = await towerRepo.getTowerLevel(1, 1);
    assertDefined(level, 'Basic tower level 1 not found');
    assertEqual(level.cost, 50, 'Basic tower level 1 cost mismatch');
  });

  await test('TowerRepository.getMaxLevel', async () => {
    const maxLevel = await towerRepo.getMaxLevel(1);
    assertEqual(maxLevel, 5, 'Basic tower max level should be 5');
  });

  // Enemy Repository
  await test('EnemyRepository.getAllEnemyDefinitions', async () => {
    const enemies = await enemyRepo.getAllEnemyDefinitions();
    assert(enemies.length >= 6, 'Expected at least 6 enemy definitions');
    const pawn = enemies.find((e) => e.id === 1);
    assertDefined(pawn, 'Pawn enemy not found');
  });

  await test('EnemyRepository.getEnemyDefinition', async () => {
    const enemy = await enemyRepo.getEnemyDefinition(5);
    assertDefined(enemy, 'Queen enemy not found');
    assertEqual(enemy.health, 300, 'Queen health mismatch');
  });

  // Settings Repository
  await test('SettingsRepository.getAllSettings', async () => {
    const settings = await settingsRepo.getAllSettings();
    assert(settings.length >= 3, 'Expected at least 3 settings presets');
  });

  await test('SettingsRepository.getSettingsByMode', async () => {
    const normal = await settingsRepo.getSettingsByMode('normal');
    assertDefined(normal, 'Normal settings not found');
    assertEqual(normal.initialCoins, 200, 'Normal initial coins mismatch');
  });

  // Game Session Repository
  await test('GameSessionRepository.createGameSession', async () => {
    const session = await sessionRepo.createGameSession({
      gameId: 'test-session-1',
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
    });
    assertEqual(session.gameId, 'test-session-1', 'Session ID mismatch');
    assertEqual(session.status, 'active', 'Session status should be active');
    // Cleanup
    await sessionRepo.deleteGameSession('test-session-1');
  });

  await test('GameSessionRepository.getGameSession', async () => {
    await sessionRepo.createGameSession({
      gameId: 'test-session-2',
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
    });
    const session = await sessionRepo.getGameSession('test-session-2');
    assertDefined(session, 'Session not found');
    assertEqual(session.gameId, 'test-session-2', 'Session ID mismatch');
    // Cleanup
    await sessionRepo.deleteGameSession('test-session-2');
  });

  await test('GameSessionRepository.updateGameSession', async () => {
    await sessionRepo.createGameSession({
      gameId: 'test-session-3',
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
    });
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
    const stat = await statsRepo.createStatistics({
      gameId: 'test-stat-1',
      timestamp: new Date(),
      duration: 60000,
      outcome: 'win',
      gameMode: '10waves',
      finalWave: 10,
      wavesCompleted: 10,
      enemiesKilledTotal: 100,
      enemiesKilledByType: { pawn: 50, knight: 50 },
      towersBuiltTotal: 5,
      towersBuiltByType: { basic: 3, sniper: 2 },
      coinsEarned: 1000,
      coinsSpent: 800,
      damageDealt: 5000,
    });
    assert(stat.id !== undefined && stat.id > 0, 'Statistics ID should be positive');

    const retrieved = await statsRepo.getStatisticsByGameId('test-stat-1');
    assertDefined(retrieved, 'Statistics not found');
    assertEqual(retrieved.outcome, 'win', 'Outcome mismatch');

    // Cleanup
    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-stat-1']);
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

  // Config Service
  await test('ConfigService.getTowerDefinitionsWithLevels', async () => {
    const towers = await configService.getTowerDefinitionsWithLevels();
    assert(towers.length >= 3, 'Expected at least 3 towers with levels');
    const basic = towers.find((t) => t.id === 1);
    assertDefined(basic, 'Basic tower not found');
    assertEqual(basic.maxLevel, 5, 'Basic tower max level mismatch');
    assertEqual(basic.levels.length, 5, 'Basic tower should have 5 levels');
  });

  await test('ConfigService.getTowerDefinitionsWithLevels (single)', async () => {
    const towers = await configService.getTowerDefinitionsWithLevels(2);
    assertEqual(towers.length, 1, 'Should return single tower');
    assertEqual(towers[0]?.id, 2, 'Should return sniper tower');
  });

  await test('ConfigService.getAllEnemyDefinitions', async () => {
    const enemies = await configService.getAllEnemyDefinitions();
    assert(enemies.length >= 6, 'Expected at least 6 enemies');
  });

  await test('ConfigService.getSettingsByMode', async () => {
    const settings = await configService.getSettingsByMode('hard');
    assertDefined(settings, 'Hard settings not found');
    assertEqual(settings.initialCoins, 150, 'Hard initial coins mismatch');
  });

  await test('ConfigService.getDefaultSettings', async () => {
    const settings = await configService.getDefaultSettings();
    assertDefined(settings, 'Default settings not found');
    assertEqual(settings.mode, 'normal', 'Default should be normal mode');
  });

  // Game Service
  // Helper to clean up a game (start wave first to avoid negative wavesCompleted validation)
  async function cleanupGame(gameId: string): Promise<void> {
    await gameService.startWave(gameId); // Ensure wave >= 1
    await gameService.endGame(gameId, 'loss', {
      duration: 0,
      enemiesKilledTotal: 0,
      enemiesKilledByType: {},
      towersBuiltTotal: 0,
      towersBuiltByType: {},
      coinsEarned: 0,
      coinsSpent: 0,
      damageDealt: 0,
    });
  }

  await test('GameService.createGame', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    assertDefined(game, 'Game not created');
    assert(game.id.length > 0, 'Game ID should not be empty');
    assertEqual(game.coins, 200, 'Initial coins mismatch');
    assertEqual(game.lives, 10, 'Initial lives mismatch');
    assertEqual(game.wave, 0, 'Initial wave should be 0');
    // Cleanup
    await cleanupGame(game.id);
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
    assertEqual(result.remainingCoins, 150, 'Remaining coins mismatch (200 - 50)');
    // Cleanup
    await cleanupGame(game.id);
  });

  await test('GameService.upgradeTower', async () => {
    const game = await gameService.createGame('10waves', 'easy'); // More coins
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
    // Cleanup
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
    assertEqual(sellResult.refundAmount, 35, 'Refund should be 70% of cost (50 * 0.7 = 35)');
    assertEqual(sellResult.remainingCoins, 185, 'Remaining coins mismatch (150 + 35)');
    // Cleanup
    await cleanupGame(game.id);
  });

  await test('GameService.startWave', async () => {
    const game = await gameService.createGame('10waves', 'normal');
    const success = await gameService.startWave(game.id);
    assert(success, 'Start wave should succeed');
    const updatedGame = await gameService.getGame(game.id);
    assertEqual(updatedGame?.wave, 1, 'Wave should be 1');
    // Cleanup - already at wave 1, so we can end directly
    await gameService.endGame(game.id, 'loss', {
      duration: 0,
      enemiesKilledTotal: 0,
      enemiesKilledByType: {},
      towersBuiltTotal: 0,
      towersBuiltByType: {},
      coinsEarned: 0,
      coinsSpent: 0,
      damageDealt: 0,
    });
  });

  // Statistics Service
  await test('StatisticsService.recordGameStatistics', async () => {
    const stat = await statsService.recordGameStatistics({
      gameId: 'test-svc-stat-1',
      timestamp: new Date(),
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
    });
    assert(stat.id !== undefined && stat.id > 0, 'Statistics should be created');
    // Cleanup
    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-svc-stat-1']);
  });

  await test('StatisticsService.getStatisticsSummary', async () => {
    // Create test data
    await statsService.recordGameStatistics({
      gameId: 'test-summary-1',
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
    });

    const summary = await statsService.getStatisticsSummary();
    assert(summary.totalGames >= 1, 'Should have at least 1 game');
    assert(summary.wins >= 1, 'Should have at least 1 win');

    // Cleanup
    await query('DELETE FROM game_statistics WHERE game_id = $1', ['test-summary-1']);
  });
}

// ============================================================
// API ENDPOINT TESTS
// ============================================================
async function testApiEndpoints(): Promise<void> {
  section('API Endpoints');

  // Health
  await test('GET /health', async () => {
    const response = await fetchJson<{
      status: string;
      timestamp: string;
      services: { database: { status: string; latency: number } };
    }>('/health');
    assertEqual(response.status, 'healthy', 'Health status should be healthy');
    assert(response.timestamp.length > 0, 'Timestamp should not be empty');
    assertEqual(response.services.database.status, 'connected', 'Database should be connected');
    assert(response.services.database.latency >= 0, 'Database latency should be non-negative');
  });

  // Config - Towers
  await test('GET /api/config/towers', async () => {
    const towers = await fetchJson<Array<{ id: string; levels: unknown[] }>>('/api/config/towers');
    assert(towers.length >= 3, 'Expected at least 3 towers');
    const basic = towers.find((t) => t.id === 'basic');
    assertDefined(basic, 'Basic tower not found');
    assert(basic.levels.length >= 5, 'Basic tower should have 5 levels');
  });

  await test('GET /api/config/towers?id=sniper', async () => {
    // When filtering by ID, the API returns a single object (not array)
    const tower = await fetchJson<{ id: string }>('/api/config/towers?id=sniper');
    assertEqual(tower.id, 'sniper', 'Should return sniper tower');
  });

  await test('GET /api/config/towers/:towerType/levels', async () => {
    const levels = await fetchJson<Array<{ level: number }>>('/api/config/towers/basic/levels');
    assertEqual(levels.length, 5, 'Basic should have 5 levels');
  });

  await test('GET /api/config/towers/:towerType/levels/:level', async () => {
    const level = await fetchJson<{ level: number; cost: number }>(
      '/api/config/towers/basic/levels/1'
    );
    assertEqual(level.level, 1, 'Level should be 1');
    assertEqual(level.cost, 50, 'Cost should be 50');
  });

  // Config - Enemies
  await test('GET /api/config/enemies', async () => {
    const enemies = await fetchJson<Array<{ id: string }>>('/api/config/enemies');
    assert(enemies.length >= 6, 'Expected at least 6 enemies');
  });

  await test('GET /api/config/enemies/:id', async () => {
    const enemy = await fetchJson<{ id: string; health: number }>('/api/config/enemies/queen');
    assertEqual(enemy.id, 'queen', 'Should return queen');
    assertEqual(enemy.health, 300, 'Queen health should be 300');
  });

  // Config - Settings
  await test('GET /api/config/settings', async () => {
    const settings = await fetchJson<Array<{ mode: string }>>('/api/config/settings');
    assert(settings.length >= 3, 'Expected at least 3 settings');
  });

  await test('GET /api/config/settings/:mode', async () => {
    const settings = await fetchJson<{ mode: string; initialCoins: number }>(
      '/api/config/settings/normal'
    );
    assertEqual(settings.mode, 'normal', 'Mode should be normal');
    assertEqual(settings.initialCoins, 200, 'Initial coins should be 200');
  });

  await test('GET /api/config/settings/default', async () => {
    const settings = await fetchJson<{ mode: string }>('/api/config/settings/default');
    assertEqual(settings.mode, 'normal', 'Default mode should be normal');
  });

  // Game
  await test('POST /api/game/start', async () => {
    const response = await fetchJson<{ gameId: string; initialCoins: number; lives: number }>(
      '/api/game/start',
      {
        method: 'POST',
        body: JSON.stringify({ difficulty: 'normal', gameMode: '10waves' }),
      }
    );
    assert(response.gameId.length > 0, 'Game ID should not be empty');
    assertEqual(response.initialCoins, 200, 'Initial coins mismatch');
    assertEqual(response.lives, 10, 'Lives mismatch');

    // Cleanup
    await fetchJson(`/api/game/${response.gameId}/end`, {
      method: 'POST',
      body: JSON.stringify({ finalWave: 0, enemiesKilled: 0 }),
    });
  });

  await test('GET /api/game/config', async () => {
    const config = await fetchJson<{ towers: unknown[]; enemies: unknown[] }>('/api/game/config');
    assert(config.towers.length >= 3, 'Expected at least 3 towers');
    assert(config.enemies.length >= 6, 'Expected at least 6 enemies');
  });

  let testGameId = '';

  await test('POST /api/game/:gameId/tower', async () => {
    // Create game first
    const gameResponse = await fetchJson<{ gameId: string }>('/api/game/start', {
      method: 'POST',
      body: JSON.stringify({ difficulty: 'normal', gameMode: '10waves' }),
    });
    testGameId = gameResponse.gameId;

    const response = await fetchJson<{
      success: boolean;
      tower: { type: string };
      remainingCoins: number;
    }>(`/api/game/${testGameId}/tower`, {
      method: 'POST',
      body: JSON.stringify({ towerType: 'basic', gridX: 5, gridY: 3 }),
    });
    assert(response.success, 'Tower build should succeed');
    assertEqual(response.tower.type, 'basic', 'Tower type mismatch');
    assertEqual(response.remainingCoins, 150, 'Remaining coins mismatch');
  });

  await test('GET /api/game/:gameId/state', async () => {
    const state = await fetchJson<{
      coins: number;
      lives: number;
      wave: number;
      towers: unknown[];
    }>(`/api/game/${testGameId}/state`);
    assertEqual(state.coins, 150, 'Coins mismatch');
    assertEqual(state.lives, 10, 'Lives mismatch');
    assertEqual(state.wave, 0, 'Wave should be 0');
    assert(state.towers.length >= 1, 'Should have at least 1 tower');
  });

  await test('POST /api/game/:gameId/wave', async () => {
    const response = await fetchJson<{ waveNumber: number; enemies: unknown[] }>(
      `/api/game/${testGameId}/wave`,
      { method: 'POST' }
    );
    assertEqual(response.waveNumber, 1, 'Wave should be 1');
    assert(response.enemies.length > 0, 'Should have enemies');
  });

  await test('POST /api/game/:gameId/end', async () => {
    const response = await fetchJson<{ success: boolean }>(`/api/game/${testGameId}/end`, {
      method: 'POST',
      body: JSON.stringify({ finalWave: 1, enemiesKilled: 5 }),
    });
    assert(response.success, 'End game should succeed');
  });

  // Statistics
  await test('GET /api/statistics/summary', async () => {
    const summary = await fetchJson<{ totalGames: number }>('/api/statistics/summary');
    assert(typeof summary.totalGames === 'number', 'totalGames should be a number');
  });

  await test('GET /api/statistics/recent', async () => {
    const recent = await fetchJson<unknown[]>('/api/statistics/recent');
    assert(Array.isArray(recent), 'Recent should be an array');
  });

  await test('GET /api/statistics/top-scores', async () => {
    const topScores = await fetchJson<unknown[]>('/api/statistics/top-scores');
    assert(Array.isArray(topScores), 'Top scores should be an array');
  });
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
