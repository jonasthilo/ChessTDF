import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  WaveDefinition,
  WaveAnalysis,
  Tier2Results,
  BalanceIssue,
} from '../types';
import { getSpawnX, getDespawnX } from '../types';

const TOTAL_DISTANCE = getDespawnX() - getSpawnX();

interface TowerDpsInfo {
  towerId: number;
  towerName: string;
  dps: number;
  adjustedCost: number;
  dpsPerCoin: number;
}

function buildTowerDpsTable(
  towers: TowerDefinition[],
  costMultiplier: number,
): TowerDpsInfo[] {
  const table: TowerDpsInfo[] = [];

  for (const tower of towers) {
    const level1 = tower.levels.find((l) => l.level === 1);
    if (!level1) continue;

    const dps = level1.damage * level1.fireRate;
    const adjustedCost = level1.cost * costMultiplier;
    const dpsPerCoin = adjustedCost > 0 ? dps / adjustedCost : 0;

    table.push({
      towerId: tower.id,
      towerName: tower.name,
      dps,
      adjustedCost,
      dpsPerCoin,
    });
  }

  // Sort by best DPS/coin ratio descending for greedy buying
  return table.sort((a, b) => b.dpsPerCoin - a.dpsPerCoin);
}

function computeAffordableDPS(
  towerTable: TowerDpsInfo[],
  availableCoins: number,
): { totalDPS: number; spent: number } {
  let coins = availableCoins;
  let totalDPS = 0;
  let spent = 0;

  // Greedy: buy the tower with the best DPS/coin ratio until we can't afford any
  let canBuy = true;
  while (canBuy) {
    canBuy = false;
    for (const tower of towerTable) {
      if (tower.adjustedCost <= coins && tower.adjustedCost > 0) {
        coins -= tower.adjustedCost;
        spent += tower.adjustedCost;
        totalDPS += tower.dps;
        canBuy = true;
        break; // restart from the top (best DPS/coin first)
      }
    }
  }

  return { totalDPS, spent };
}

function getWaveComposition(
  waves: WaveDefinition[],
  waveNumber: number,
): WaveDefinition {
  const sorted = [...waves].sort((a, b) => a.waveNumber - b.waveNumber);
  const maxWave = sorted[sorted.length - 1];

  const exact = sorted.find((w) => w.waveNumber === waveNumber);
  if (exact) return exact;

  // If wave > max defined wave, use the max defined wave's composition
  if (maxWave) return maxWave;

  // Fallback: empty wave (should not happen in practice)
  return { waveNumber, enemies: [] };
}

export function analyzeTier2(
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
  waves: WaveDefinition[],
  numWaves: number,
): Tier2Results {
  const towerTable = buildTowerDpsTable(towers, settings.towerCostMultiplier);
  const cheapestTowerCost =
    towerTable.length > 0
      ? Math.min(...towerTable.map((t) => t.adjustedCost).filter((c) => c > 0))
      : Infinity;

  const enemyMap = new Map<number, EnemyDefinition>();
  for (const enemy of enemies) {
    enemyMap.set(enemy.id, enemy);
  }

  const waveAnalyses: WaveAnalysis[] = [];
  const issues: BalanceIssue[] = [];
  let cumulativeCoins = settings.initialCoins;
  let economyStallWave: number | null = null;

  for (let wave = 1; wave <= numWaves; wave++) {
    const composition = getWaveComposition(waves, wave);

    let totalScaledHP = 0;
    let totalReward = 0;
    let slowestScaledSpeed = Infinity;
    let totalSpawnTimeMs = 0;

    for (const group of composition.enemies) {
      const enemyDef = enemyMap.get(group.enemyId);
      if (!enemyDef) continue;

      const scaledHealth = Math.round(
        enemyDef.health *
          settings.enemyHealthMultiplier *
          (1 + wave * settings.enemyHealthWaveMultiplier),
      );
      const scaledReward = Math.round(
        enemyDef.reward *
          settings.enemyRewardMultiplier *
          (1 + wave * settings.enemyRewardWaveMultiplier),
      );
      const scaledSpeed = enemyDef.speed * settings.enemySpeedMultiplier;

      totalScaledHP += group.count * scaledHealth;
      totalReward += group.count * scaledReward;
      totalSpawnTimeMs += group.count * group.spawnDelayMs;

      if (scaledSpeed < slowestScaledSpeed && scaledSpeed > 0) {
        slowestScaledSpeed = scaledSpeed;
      }
    }

    // Estimate wave duration
    const travelDuration =
      slowestScaledSpeed > 0 && slowestScaledSpeed < Infinity
        ? TOTAL_DISTANCE / slowestScaledSpeed
        : 0;
    const totalSpawnTimeSec = totalSpawnTimeMs / 1000;
    const estimatedDuration = Math.max(travelDuration, totalSpawnTimeSec);

    // Min DPS required to clear the wave
    const minDPSRequired =
      estimatedDuration > 0 ? totalScaledHP / estimatedDuration : 0;

    // Affordable DPS with current coins (greedy tower buying)
    const { totalDPS: affordableDPS, spent } = computeAffordableDPS(
      towerTable,
      cumulativeCoins,
    );

    const surplusRatio =
      minDPSRequired > 0 ? affordableDPS / minDPSRequired : Infinity;

    const netFlow = totalReward - spent;
    cumulativeCoins = cumulativeCoins - spent + totalReward;

    waveAnalyses.push({
      wave,
      difficulty: settings.mode,
      totalScaledHP,
      totalReward,
      minDPSRequired,
      affordableDPS,
      surplusRatio,
      cumulativeCoins,
      netFlow,
    });

    // Track economy stall: first wave where cumulative coins < cheapest tower
    if (
      economyStallWave === null &&
      cumulativeCoins < cheapestTowerCost
    ) {
      economyStallWave = wave;
    }
  }

  // Detect impossible waves
  const impossibleWaves = waveAnalyses.filter((w) => w.surplusRatio < 1.0);

  // Detect difficulty spikes (surplus drops > 50% wave-to-wave)
  const difficultySpikes: Tier2Results['difficultySpikes'] = [];
  for (let i = 1; i < waveAnalyses.length; i++) {
    const prev = waveAnalyses[i - 1]!;
    const curr = waveAnalyses[i]!;

    if (
      prev.surplusRatio > 0 &&
      prev.surplusRatio < Infinity &&
      curr.surplusRatio < Infinity
    ) {
      const dropPercent =
        ((prev.surplusRatio - curr.surplusRatio) / prev.surplusRatio) * 100;
      if (dropPercent > 50) {
        difficultySpikes.push({ from: prev, to: curr, dropPercent });
      }
    }
  }

  // Detect trivially easy waves
  const trivialWaves = waveAnalyses.filter(
    (w) => w.surplusRatio > 5.0 && w.surplusRatio < Infinity,
  );

  // Build issues list
  for (const w of impossibleWaves) {
    issues.push({
      severity: 'critical',
      category: 'impossible-wave',
      description: `Wave ${w.wave} is impossible: need ${w.minDPSRequired.toFixed(1)} DPS but can only afford ${w.affordableDPS.toFixed(1)} DPS (surplus ratio ${w.surplusRatio.toFixed(2)})`,
      details: {
        wave: w.wave,
        minDPSRequired: w.minDPSRequired,
        affordableDPS: w.affordableDPS,
        surplusRatio: w.surplusRatio,
      },
    });
  }

  for (const spike of difficultySpikes) {
    issues.push({
      severity: 'high',
      category: 'difficulty-spike',
      description: `Difficulty spike from wave ${spike.from.wave} to ${spike.to.wave}: surplus drops ${spike.dropPercent.toFixed(0)}% (${spike.from.surplusRatio.toFixed(2)} -> ${spike.to.surplusRatio.toFixed(2)})`,
      details: {
        fromWave: spike.from.wave,
        toWave: spike.to.wave,
        fromSurplus: spike.from.surplusRatio,
        toSurplus: spike.to.surplusRatio,
        dropPercent: spike.dropPercent,
      },
    });
  }

  for (const w of trivialWaves) {
    issues.push({
      severity: 'low',
      category: 'trivial-wave',
      description: `Wave ${w.wave} is trivially easy: surplus ratio ${w.surplusRatio.toFixed(2)}x`,
      details: {
        wave: w.wave,
        surplusRatio: w.surplusRatio,
        affordableDPS: w.affordableDPS,
        minDPSRequired: w.minDPSRequired,
      },
    });
  }

  if (economyStallWave !== null) {
    issues.push({
      severity: 'high',
      category: 'economy-stall',
      description: `Economy stalls at wave ${economyStallWave}: cumulative coins drop below cheapest tower cost (${cheapestTowerCost.toFixed(0)})`,
      details: {
        wave: economyStallWave,
        cheapestTowerCost,
      },
    });
  }

  return {
    waveAnalyses,
    impossibleWaves,
    difficultySpikes,
    trivialWaves,
    economyStallWave,
    issues,
  };
}
