import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  WaveDefinition,
  Tier3Results,
  SensitivityResult,
  BalanceIssue,
} from '../types';
import { SimulationEngine } from '../simulation/SimulationEngine';
import {
  getAllStrategyNames,
  getStrategy,
} from '../simulation/strategies/index';
import { MetricsCollector } from './MetricsCollector';

/** Perturbation factor for sensitivity analysis (+/- 10%). */
const PERTURBATION = 0.1;

/** Strategy used for sensitivity analysis runs (deterministic, middle-ground). */
const SENSITIVITY_STRATEGY = 'balanced';

/**
 * Deep-clone a tower definition array so we can safely mutate level stats.
 */
function cloneTowers(towers: TowerDefinition[]): TowerDefinition[] {
  return structuredClone(towers);
}

/**
 * Deep-clone an enemy definition array so we can safely mutate stats.
 */
function cloneEnemies(enemies: EnemyDefinition[]): EnemyDefinition[] {
  return structuredClone(enemies);
}

/**
 * Run Tier 3 analysis: baseline simulations across all strategies,
 * aggregate metrics, and HITB sensitivity analysis.
 */
export async function analyzeTier3(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
  simRuns: number,
): Promise<Tier3Results> {
  // --- Phase A: Baseline simulations ---
  const collector = new MetricsCollector();
  const strategyNames = getAllStrategyNames();

  for (const strategyName of strategyNames) {
    for (let run = 0; run < simRuns; run++) {
      const strategy = getStrategy(strategyName);
      const engine = new SimulationEngine(
        towers,
        enemies,
        settings,
        waves,
        strategy,
        numWaves,
      );
      const result = engine.run();
      collector.addRun(result);
    }
  }

  // --- Phase B: Aggregate metrics ---
  const winRateByStrategy = collector.getWinRateByStrategy();
  const towerPickRate = collector.getTowerPickRate();
  const towerDamageShare = collector.getTowerDamageShare();
  const enemyLeakRate = collector.getEnemyLeakRate();

  // Compute baseline wavesCompleted for sensitivity comparison
  const baselineWaves = getBaselineWavesCompleted(
    towers,
    enemies,
    settings,
    waves,
    numWaves,
  );

  // --- Phase C: HITB Sensitivity analysis ---
  const sensitivity: SensitivityResult[] = [];

  // Tower sensitivity: damage, fireRate, range (level 1 of each tower)
  for (const tower of towers) {
    const level1 = tower.levels.find((l) => l.level === 1);
    if (!level1) continue;

    // Damage perturbation
    sensitivity.push(
      ...runTowerSensitivity(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        tower.id,
        tower.name,
        'damage',
        level1.damage,
        baselineWaves,
      ),
    );

    // FireRate perturbation
    sensitivity.push(
      ...runTowerSensitivity(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        tower.id,
        tower.name,
        'fireRate',
        level1.fireRate,
        baselineWaves,
      ),
    );

    // Range perturbation
    sensitivity.push(
      ...runTowerSensitivity(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        tower.id,
        tower.name,
        'range',
        level1.range,
        baselineWaves,
      ),
    );
  }

  // Enemy sensitivity: health, speed (each enemy)
  for (const enemy of enemies) {
    // Health perturbation
    sensitivity.push(
      ...runEnemySensitivity(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        enemy.id,
        enemy.name,
        'health',
        enemy.health,
        baselineWaves,
      ),
    );

    // Speed perturbation
    sensitivity.push(
      ...runEnemySensitivity(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        enemy.id,
        enemy.name,
        'speed',
        enemy.speed,
        baselineWaves,
      ),
    );
  }

  // --- Detect issues ---
  const issues = detectIssues(
    winRateByStrategy,
    towerPickRate,
    enemyLeakRate,
  );

  return {
    runs: collector.getRuns(),
    winRateByStrategy,
    towerPickRate,
    towerDamageShare,
    enemyLeakRate,
    sensitivity,
    issues,
  };
}

/**
 * Run baseline simulation with the sensitivity strategy and return wavesCompleted.
 */
function getBaselineWavesCompleted(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
): number {
  const strategy = getStrategy(SENSITIVITY_STRATEGY);
  const engine = new SimulationEngine(
    towers,
    enemies,
    settings,
    waves,
    strategy,
    numWaves,
  );
  const result = engine.run();
  return result.wavesCompleted;
}

/**
 * Run sensitivity analysis for a tower parameter.
 * Perturbs the parameter +/- PERTURBATION and measures impact on wavesCompleted.
 */
function runTowerSensitivity(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
  towerId: number,
  towerName: string,
  parameter: 'damage' | 'fireRate' | 'range',
  baseValue: number,
  baselineWaves: number,
): SensitivityResult[] {
  const results: SensitivityResult[] = [];

  // +10% perturbation
  const plusTowers = cloneTowers(towers);
  const plusTower = plusTowers.find((t) => t.id === towerId);
  if (plusTower) {
    const plusLevel1 = plusTower.levels.find((l) => l.level === 1);
    if (plusLevel1) {
      plusLevel1[parameter] = baseValue * (1 + PERTURBATION);
    }
  }
  const plusWaves = runSingleSensitivity(
    plusTowers,
    enemies,
    settings,
    waves,
    numWaves,
  );

  // -10% perturbation
  const minusTowers = cloneTowers(towers);
  const minusTower = minusTowers.find((t) => t.id === towerId);
  if (minusTower) {
    const minusLevel1 = minusTower.levels.find((l) => l.level === 1);
    if (minusLevel1) {
      minusLevel1[parameter] = baseValue * (1 - PERTURBATION);
    }
  }
  const minusWaves = runSingleSensitivity(
    minusTowers,
    enemies,
    settings,
    waves,
    numWaves,
  );

  // impact = |metric_plus - metric_minus| / baseline_metric
  const impact =
    baselineWaves > 0
      ? Math.abs(plusWaves - minusWaves) / baselineWaves
      : 0;

  // Direction: does increasing this parameter help (buff) or hurt (nerf)?
  const direction: 'buff' | 'nerf' = plusWaves >= minusWaves ? 'buff' : 'nerf';

  results.push({
    parameter: `tower.${parameter}`,
    target: towerName,
    baselineValue: baseValue,
    impact,
    direction,
  });

  return results;
}

/**
 * Run sensitivity analysis for an enemy parameter.
 * Perturbs the parameter +/- PERTURBATION and measures impact on wavesCompleted.
 */
function runEnemySensitivity(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
  enemyId: number,
  enemyName: string,
  parameter: 'health' | 'speed',
  baseValue: number,
  baselineWaves: number,
): SensitivityResult[] {
  const results: SensitivityResult[] = [];

  // +10% perturbation (increasing enemy health/speed makes it harder)
  const plusEnemies = cloneEnemies(enemies);
  const plusEnemy = plusEnemies.find((e) => e.id === enemyId);
  if (plusEnemy) {
    plusEnemy[parameter] = baseValue * (1 + PERTURBATION);
  }
  const plusWaves = runSingleSensitivity(
    towers,
    plusEnemies,
    settings,
    waves,
    numWaves,
  );

  // -10% perturbation
  const minusEnemies = cloneEnemies(enemies);
  const minusEnemy = minusEnemies.find((e) => e.id === enemyId);
  if (minusEnemy) {
    minusEnemy[parameter] = baseValue * (1 - PERTURBATION);
  }
  const minusWaves = runSingleSensitivity(
    towers,
    minusEnemies,
    settings,
    waves,
    numWaves,
  );

  const impact =
    baselineWaves > 0
      ? Math.abs(plusWaves - minusWaves) / baselineWaves
      : 0;

  // For enemies: increasing health/speed is a nerf (makes game harder for player)
  const direction: 'buff' | 'nerf' = plusWaves >= minusWaves ? 'buff' : 'nerf';

  results.push({
    parameter: `enemy.${parameter}`,
    target: enemyName,
    baselineValue: baseValue,
    impact,
    direction,
  });

  return results;
}

/**
 * Run a single simulation with the sensitivity strategy, returning wavesCompleted.
 */
function runSingleSensitivity(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
): number {
  const strategy = getStrategy(SENSITIVITY_STRATEGY);
  const engine = new SimulationEngine(
    towers,
    enemies,
    settings,
    waves,
    strategy,
    numWaves,
  );
  const result = engine.run();
  return result.wavesCompleted;
}

/**
 * Detect balance issues from aggregated metrics.
 */
function detectIssues(
  winRateByStrategy: Record<string, number>,
  towerPickRate: Record<number, number>,
  enemyLeakRate: Record<number, number>,
): BalanceIssue[] {
  const issues: BalanceIssue[] = [];

  // Tower pick rate > 60% -> high severity (one tower dominates)
  for (const [towerIdStr, rate] of Object.entries(towerPickRate)) {
    if (rate > 0.6) {
      issues.push({
        severity: 'high',
        category: 'tower-dominance',
        description: `Tower ${towerIdStr} has ${(rate * 100).toFixed(1)}% pick rate (>60%). One tower type dominates.`,
        details: { towerId: Number(towerIdStr), pickRate: rate },
      });
    }
  }

  // Tower pick rate < 10% -> medium severity (tower is underused)
  for (const [towerIdStr, rate] of Object.entries(towerPickRate)) {
    if (rate < 0.1) {
      issues.push({
        severity: 'medium',
        category: 'tower-underuse',
        description: `Tower ${towerIdStr} has only ${(rate * 100).toFixed(1)}% pick rate (<10%). Tower may be underpowered or overpriced.`,
        details: { towerId: Number(towerIdStr), pickRate: rate },
      });
    }
  }

  // Enemy leak rate > 50% -> high severity
  for (const [enemyIdStr, rate] of Object.entries(enemyLeakRate)) {
    if (rate > 0.5) {
      issues.push({
        severity: 'high',
        category: 'enemy-leak',
        description: `Enemy ${enemyIdStr} has ${(rate * 100).toFixed(1)}% leak rate (>50%). This enemy escapes too often.`,
        details: { enemyId: Number(enemyIdStr), leakRate: rate },
      });
    }
  }

  // Strategy win rate variance too high (max - min > 40%)
  const winRates = Object.values(winRateByStrategy);
  if (winRates.length > 1) {
    const maxRate = Math.max(...winRates);
    const minRate = Math.min(...winRates);
    const variance = maxRate - minRate;

    if (variance > 0.4) {
      issues.push({
        severity: 'medium',
        category: 'strategy-variance',
        description: `Strategy win rate variance is ${(variance * 100).toFixed(0)}% (>40%). Balance may be too dependent on placement strategy.`,
        details: { maxRate, minRate, variance },
      });
    }
  }

  return issues;
}
