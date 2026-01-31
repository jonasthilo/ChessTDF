import type { SimulationRunResult } from '../types';

/**
 * Aggregates metrics across multiple simulation runs.
 * Tracks win rates, tower pick rates, damage shares, and enemy leak rates.
 */
export class MetricsCollector {
  private readonly runs: SimulationRunResult[] = [];

  addRun(result: SimulationRunResult): void {
    this.runs.push(result);
  }

  getRuns(): SimulationRunResult[] {
    return [...this.runs];
  }

  /**
   * Win rate per strategy as a fraction 0-1.
   * Win = wavesCompleted === totalWaves && livesRemaining > 0.
   */
  getWinRateByStrategy(): Record<string, number> {
    const strategyWins: Record<string, number> = {};
    const strategyCounts: Record<string, number> = {};

    for (const run of this.runs) {
      strategyCounts[run.strategy] =
        (strategyCounts[run.strategy] ?? 0) + 1;

      const won =
        run.wavesCompleted === run.totalWaves && run.livesRemaining > 0;
      if (won) {
        strategyWins[run.strategy] =
          (strategyWins[run.strategy] ?? 0) + 1;
      }
    }

    const result: Record<string, number> = {};
    for (const [strategy, count] of Object.entries(strategyCounts)) {
      const wins = strategyWins[strategy] ?? 0;
      result[strategy] = count > 0 ? wins / count : 0;
    }

    return result;
  }

  /**
   * Tower pick rate: fraction of total tower placements across all runs
   * that belong to each tower ID.
   */
  getTowerPickRate(): Record<number, number> {
    const towerCounts: Record<number, number> = {};
    let totalPlacements = 0;

    for (const run of this.runs) {
      for (const [towerIdStr, count] of Object.entries(run.towerUsage)) {
        const towerId = Number(towerIdStr);
        towerCounts[towerId] = (towerCounts[towerId] ?? 0) + count;
        totalPlacements += count;
      }
    }

    const result: Record<number, number> = {};
    for (const [towerIdStr, count] of Object.entries(towerCounts)) {
      const towerId = Number(towerIdStr);
      result[towerId] = totalPlacements > 0 ? count / totalPlacements : 0;
    }

    return result;
  }

  /**
   * Tower damage share: weighted average of damage share across all runs.
   * Each run contributes equally to the average.
   */
  getTowerDamageShare(): Record<number, number> {
    if (this.runs.length === 0) return {};

    const towerDamageSum: Record<number, number> = {};
    const allTowerIds = new Set<number>();

    for (const run of this.runs) {
      for (const [towerIdStr, share] of Object.entries(run.towerDamageShare)) {
        const towerId = Number(towerIdStr);
        allTowerIds.add(towerId);
        towerDamageSum[towerId] =
          (towerDamageSum[towerId] ?? 0) + share;
      }
    }

    const result: Record<number, number> = {};
    for (const towerId of allTowerIds) {
      const sum = towerDamageSum[towerId] ?? 0;
      result[towerId] = sum / this.runs.length;
    }

    return result;
  }

  /**
   * Enemy leak rate: weighted average of leak rates across all runs.
   * Each run contributes equally to the average.
   */
  getEnemyLeakRate(): Record<number, number> {
    if (this.runs.length === 0) return {};

    const enemyLeakSum: Record<number, number> = {};
    const allEnemyIds = new Set<number>();

    for (const run of this.runs) {
      for (const [enemyIdStr, rate] of Object.entries(run.enemyLeakRate)) {
        const enemyId = Number(enemyIdStr);
        allEnemyIds.add(enemyId);
        enemyLeakSum[enemyId] =
          (enemyLeakSum[enemyId] ?? 0) + rate;
      }
    }

    const result: Record<number, number> = {};
    for (const enemyId of allEnemyIds) {
      const sum = enemyLeakSum[enemyId] ?? 0;
      result[enemyId] = sum / this.runs.length;
    }

    return result;
  }
}
