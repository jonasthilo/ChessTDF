import { GAME_CONSTANTS } from '../../types';
import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';

/** Rows adjacent to the enemy path (rows 4-5). */
const ADJACENT_ROWS = [3, 6] as const;

/** Fraction of coins to reserve for future waves. */
const RESERVE_RATIO = 0.2;

/** Column priority: center columns first, spreading outward. */
function getCenterPriorityColumns(): number[] {
  const cols: number[] = [];
  const mid = Math.floor(GAME_CONSTANTS.GRID_COLS / 2);

  for (let offset = 0; offset < GAME_CONSTANTS.GRID_COLS; offset++) {
    const left = mid - offset;
    const right = mid + offset;
    if (left >= 0 && left < GAME_CONSTANTS.GRID_COLS && !cols.includes(left)) {
      cols.push(left);
    }
    if (
      right >= 0 &&
      right < GAME_CONSTANTS.GRID_COLS &&
      !cols.includes(right)
    ) {
      cols.push(right);
    }
  }

  return cols;
}

/**
 * Balanced strategy: a mix of upgrading and building.
 * Upgrades existing towers before building new ones.
 * Places on rows 3 and 6. Alternates tower types evenly.
 * Saves a fraction of coins for future waves.
 */
export class BalancedStrategy implements Strategy {
  readonly name = 'balanced';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    const actions: StrategyAction[] = [];
    if (towers.length === 0) return actions;

    // Reserve some coins for future
    const spendableBudget = Math.floor(
      state.coins * (1 - RESERVE_RATIO),
    );
    let availableCoins = spendableBudget;

    // Phase 1: Upgrade existing towers (prioritize lower-level towers first)
    const sortedTowers = [...state.towers].sort(
      (a, b) => a.level - b.level,
    );

    for (const tower of sortedTowers) {
      if (availableCoins <= 0) break;

      const towerDef = towers.find((t) => t.id === tower.towerId);
      if (!towerDef) continue;

      const nextLevel = tower.level + 1;
      const nextLevelDef = towerDef.levels.find((l) => l.level === nextLevel);
      if (!nextLevelDef) continue; // already max

      const cost = Math.round(
        nextLevelDef.cost * settings.towerCostMultiplier,
      );
      if (availableCoins >= cost) {
        actions.push({
          type: 'upgrade',
          targetTowerInstanceId: tower.id,
        });
        availableCoins -= cost;
      }
    }

    // Phase 2: Build new towers on adjacent rows, center first
    const priorityCols = getCenterPriorityColumns();

    for (const row of ADJACENT_ROWS) {
      for (const col of priorityCols) {
        if (availableCoins <= 0) break;

        const occupied = state.towers.some(
          (t) => t.gridX === col && t.gridY === row,
        );
        if (occupied) continue;

        // Pick tower type for even mix (alternate types)
        const towerDef = this.pickLeastUsedTower(state, towers);
        if (!towerDef) break;

        const level1 = towerDef.levels.find((l) => l.level === 1);
        if (!level1) continue;

        const cost = Math.round(level1.cost * settings.towerCostMultiplier);
        if (availableCoins < cost) continue;

        actions.push({
          type: 'build',
          towerId: towerDef.id,
          gridX: col,
          gridY: row,
        });
        availableCoins -= cost;
      }
    }

    return actions;
  }

  private pickLeastUsedTower(
    state: SimState,
    towers: TowerDefinition[],
  ): TowerDefinition | undefined {
    let minCount = Infinity;
    let selected: TowerDefinition | undefined;

    for (const towerDef of towers) {
      const count = state.towerUsage[towerDef.id] ?? 0;
      if (count < minCount) {
        minCount = count;
        selected = towerDef;
      }
    }

    return selected;
  }
}
