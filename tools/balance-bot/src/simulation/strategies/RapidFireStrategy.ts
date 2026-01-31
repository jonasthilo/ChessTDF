import { GAME_CONSTANTS } from '../../types';
import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';

/** Rows adjacent to the enemy path (rows 4-5). */
const ADJACENT_ROWS = [3, 6] as const;

/** Column priority: center columns first, spreading outward (maximize range coverage). */
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
 * Rapid-fire strategy: prioritizes the tower with the highest base fireRate.
 * Places on rows 3 and 6, as close to center as possible.
 * Upgrades existing rapid towers before building new ones.
 * Fills remaining budget with other tower types.
 */
export class RapidFireStrategy implements Strategy {
  readonly name = 'rapid-fire';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    const actions: StrategyAction[] = [];
    if (towers.length === 0) return actions;

    const rapidDef = this.findHighestFireRateTower(towers);
    if (!rapidDef) return actions;

    let availableCoins = state.coins;

    // Phase 1: Upgrade existing rapid towers to max before building new ones
    const rapidTowers = state.towers
      .filter((t) => t.towerId === rapidDef.id)
      .sort((a, b) => a.level - b.level);

    for (const tower of rapidTowers) {
      if (availableCoins <= 0) break;

      const nextLevel = tower.level + 1;
      const nextLevelDef = rapidDef.levels.find((l) => l.level === nextLevel);
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

    // Phase 2: Build rapid towers on adjacent rows, center first
    const priorityCols = getCenterPriorityColumns();

    for (const row of ADJACENT_ROWS) {
      for (const col of priorityCols) {
        if (availableCoins <= 0) break;

        const occupied = state.towers.some(
          (t) => t.gridX === col && t.gridY === row,
        );
        if (occupied) continue;

        const level1 = rapidDef.levels.find((l) => l.level === 1);
        if (!level1) continue;

        const cost = Math.round(level1.cost * settings.towerCostMultiplier);
        if (availableCoins < cost) continue;

        actions.push({
          type: 'build',
          towerId: rapidDef.id,
          gridX: col,
          gridY: row,
        });
        availableCoins -= cost;
      }
    }

    // Phase 3: Fill remaining budget with other tower types (least used)
    for (const row of ADJACENT_ROWS) {
      for (const col of priorityCols) {
        if (availableCoins <= 0) break;

        const occupied = state.towers.some(
          (t) => t.gridX === col && t.gridY === row,
        );
        if (occupied) continue;

        const fillDef = this.pickLeastUsedNonRapid(state, towers, rapidDef.id);
        if (!fillDef) break;

        const level1 = fillDef.levels.find((l) => l.level === 1);
        if (!level1) continue;

        const cost = Math.round(level1.cost * settings.towerCostMultiplier);
        if (availableCoins < cost) continue;

        actions.push({
          type: 'build',
          towerId: fillDef.id,
          gridX: col,
          gridY: row,
        });
        availableCoins -= cost;
      }
    }

    return actions;
  }

  private findHighestFireRateTower(
    towers: TowerDefinition[],
  ): TowerDefinition | undefined {
    let best: TowerDefinition | undefined;
    let bestFireRate = -Infinity;

    for (const tower of towers) {
      const level1 = tower.levels.find((l) => l.level === 1);
      if (!level1) continue;

      if (level1.fireRate > bestFireRate) {
        bestFireRate = level1.fireRate;
        best = tower;
      }
    }

    return best;
  }

  private pickLeastUsedNonRapid(
    state: SimState,
    towers: TowerDefinition[],
    rapidTowerId: number,
  ): TowerDefinition | undefined {
    let minCount = Infinity;
    let selected: TowerDefinition | undefined;

    for (const towerDef of towers) {
      if (towerDef.id === rapidTowerId) continue;
      const count = state.towerUsage[towerDef.id] ?? 0;
      if (count < minCount) {
        minCount = count;
        selected = towerDef;
      }
    }

    return selected;
  }
}
