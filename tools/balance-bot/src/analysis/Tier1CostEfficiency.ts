import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  TowerLevelMetrics,
  TowerEnemyMatchup,
  Tier1Results,
  BalanceIssue,
} from '../types';
import { getGridSize } from '../types';

const ANALYSIS_WAVES = [1, 5, 10] as const;

function computeTowerMetrics(
  towers: TowerDefinition[],
  costMultiplier: number,
): TowerLevelMetrics[] {
  const metrics: TowerLevelMetrics[] = [];

  for (const tower of towers) {
    const sortedLevels = [...tower.levels].sort((a, b) => a.level - b.level);
    let cumulativeCost = 0;

    for (const level of sortedLevels) {
      const adjustedCost = level.cost * costMultiplier;
      cumulativeCost += adjustedCost;
      const dps = level.damage * level.fireRate;
      const dpsPerCoin = cumulativeCost > 0 ? dps / cumulativeCost : 0;

      metrics.push({
        towerId: tower.id,
        towerName: tower.name,
        level: level.level,
        dps,
        cumulativeCost,
        dpsPerCoin,
      });
    }
  }

  return metrics;
}

function computeMatchups(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): TowerEnemyMatchup[] {
  const matchups: TowerEnemyMatchup[] = [];
  const gridSize = getGridSize();

  for (const tower of towers) {
    const sortedLevels = [...tower.levels].sort((a, b) => a.level - b.level);

    for (const level of sortedLevels) {
      const dps = level.damage * level.fireRate;
      const verticalDist = gridSize;

      let horizontalCoverage: number;
      if (level.range <= verticalDist) {
        horizontalCoverage = 0;
      } else {
        horizontalCoverage =
          2 * Math.sqrt(level.range ** 2 - verticalDist ** 2);
      }

      for (const enemy of enemies) {
        for (const wave of ANALYSIS_WAVES) {
          const scaledHealth = Math.round(
            enemy.health *
              settings.enemyHealthMultiplier *
              (1 + wave * settings.enemyHealthWaveMultiplier),
          );
          const scaledSpeed = enemy.speed * settings.enemySpeedMultiplier;

          const ttk = dps > 0 ? scaledHealth / dps : Infinity;
          const shotsToKill =
            level.damage > 0 ? Math.ceil(scaledHealth / level.damage) : Infinity;
          const overkillRatio =
            scaledHealth > 0 && level.damage > 0
              ? (shotsToKill * level.damage) / scaledHealth
              : level.damage > 0 ? 1 : Infinity;

          const rangeCoverageTime =
            scaledSpeed > 0 ? horizontalCoverage / scaledSpeed : Infinity;

          const canKillBeforeEscape = ttk < rangeCoverageTime;

          matchups.push({
            towerId: tower.id,
            towerName: tower.name,
            towerLevel: level.level,
            enemyId: enemy.id,
            enemyName: enemy.name,
            wave,
            scaledHealth,
            ttk,
            shotsToKill,
            overkillRatio,
            rangeCoverageTime,
            canKillBeforeEscape,
          });
        }
      }
    }
  }

  return matchups;
}

function detectIssues(
  towerMetrics: TowerLevelMetrics[],
  matchups: TowerEnemyMatchup[],
  towers: TowerDefinition[],
): BalanceIssue[] {
  const issues: BalanceIssue[] = [];

  // Check DPS/cost spread at each level
  const levels = [...new Set(towerMetrics.map((m) => m.level))];
  for (const level of levels) {
    const metricsAtLevel = towerMetrics.filter((m) => m.level === level);
    if (metricsAtLevel.length < 2) continue;

    const dpsPerCoinValues = metricsAtLevel.map((m) => m.dpsPerCoin);
    const maxDpc = Math.max(...dpsPerCoinValues);
    const minDpc = Math.min(...dpsPerCoinValues.filter((v) => v > 0));

    if (minDpc > 0 && maxDpc / minDpc > 2) {
      const best = metricsAtLevel.find((m) => m.dpsPerCoin === maxDpc);
      const worst = metricsAtLevel.find((m) => m.dpsPerCoin === minDpc);
      issues.push({
        severity: 'high',
        category: 'dps-cost-spread',
        description: `DPS/coin spread > 2x at level ${level}: ${best?.towerName ?? '?'} (${maxDpc.toFixed(3)}) vs ${worst?.towerName ?? '?'} (${minDpc.toFixed(3)})`,
        details: { level, maxDpc, minDpc, ratio: maxDpc / minDpc },
      });
    }
  }

  // Check overkill ratios
  for (const matchup of matchups) {
    if (matchup.overkillRatio > 3.0) {
      issues.push({
        severity: 'medium',
        category: 'overkill',
        description: `${matchup.towerName} L${matchup.towerLevel} has ${matchup.overkillRatio.toFixed(1)}x overkill vs ${matchup.enemyName} at wave ${matchup.wave}`,
        details: {
          towerId: matchup.towerId,
          towerLevel: matchup.towerLevel,
          enemyId: matchup.enemyId,
          wave: matchup.wave,
          overkillRatio: matchup.overkillRatio,
        },
      });
    }
  }

  // Group by enemy+wave: if ALL towers at level 1 fail, it is critical
  const enemyWavePairs = [
    ...new Set(matchups.map((m) => `${m.enemyId}:${m.wave}`)),
  ];
  for (const pair of enemyWavePairs) {
    const parts = pair.split(':');
    const enemyId = Number(parts[0] ?? '0');
    const wave = Number(parts[1] ?? '0');

    const level1Matchups = matchups.filter(
      (m) => m.enemyId === enemyId && m.wave === wave && m.towerLevel === 1,
    );

    if (
      level1Matchups.length > 0 &&
      level1Matchups.every((m) => !m.canKillBeforeEscape)
    ) {
      const enemyName = level1Matchups[0]?.enemyName ?? '?';
      issues.push({
        severity: 'critical',
        category: 'unkillable',
        description: `No tower can kill ${enemyName} before escape at wave ${wave} (level 1)`,
        details: {
          enemyId,
          wave,
          towersTested: level1Matchups.map((m) => m.towerName),
        },
      });
    }
  }

  // Check for one tower dominating all matchups
  if (towers.length > 1) {
    for (const level of levels) {
      const metricsAtLevel = towerMetrics.filter((m) => m.level === level);
      if (metricsAtLevel.length < 2) continue;

      const best = metricsAtLevel.reduce((a, b) =>
        a.dpsPerCoin > b.dpsPerCoin ? a : b,
      );

      const dominatesAllLevels = levels.every((lv) => {
        const atLevel = towerMetrics.filter((m) => m.level === lv);
        if (atLevel.length < 2) return false;
        const bestAtLevel = atLevel.reduce((a, b) =>
          a.dpsPerCoin > b.dpsPerCoin ? a : b,
        );
        return bestAtLevel.towerId === best.towerId;
      });

      if (dominatesAllLevels) {
        issues.push({
          severity: 'high',
          category: 'dominance',
          description: `${best.towerName} has the best DPS/coin at every level, making other towers suboptimal`,
          details: { towerId: best.towerId, towerName: best.towerName },
        });
        break; // Only report once
      }
    }
  }

  return issues;
}

export function analyzeTier1(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): Tier1Results {
  const towerMetrics = computeTowerMetrics(
    towers,
    settings.towerCostMultiplier,
  );
  const matchups = computeMatchups(towers, enemies, settings);

  // Compute overall DPS spread across all level-1 metrics
  const level1Metrics = towerMetrics.filter((m) => m.level === 1);
  const dpsValues = level1Metrics.map((m) => m.dpsPerCoin).filter((v) => v > 0);
  const dpsSpread =
    dpsValues.length >= 2
      ? Math.max(...dpsValues) / Math.min(...dpsValues)
      : 1;

  const issues = detectIssues(towerMetrics, matchups, towers);

  return {
    towerMetrics,
    matchups,
    dpsSpread,
    issues,
  };
}
