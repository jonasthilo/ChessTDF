import { GAME_CONSTANTS } from '../../types';
import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, StrategyAction } from '../SimulationTypes';

/**
 * Row priority: closest to enemy path (rows 4-5) first, expanding outward.
 * Towers closer to the path have better range coverage.
 */
const ROW_PRIORITY = [3, 6, 2, 7, 1, 8, 0, 9] as const;

/**
 * Number of edge columns to skip on each side.
 * Enemies spawn on the left and despawn on the right, so edge towers
 * have minimal coverage time.
 */
const EDGE_MARGIN = 2;

/**
 * Get column priority: center columns first, skipping edge columns.
 * For a 20-column grid with EDGE_MARGIN=2, uses columns 2-17 ordered from center out.
 */
export function getColumnPriority(): number[] {
  const cols: number[] = [];
  const mid = Math.floor(GAME_CONSTANTS.GRID_COLS / 2);
  const minCol = EDGE_MARGIN;
  const maxCol = GAME_CONSTANTS.GRID_COLS - EDGE_MARGIN;

  for (let offset = 0; offset < GAME_CONSTANTS.GRID_COLS; offset++) {
    const left = mid - offset;
    const right = mid + offset;
    if (left >= minCol && left < maxCol && !cols.includes(left)) {
      cols.push(left);
    }
    if (right >= minCol && right < maxCol && !cols.includes(right)) {
      cols.push(right);
    }
  }

  return cols;
}

/**
 * Get row priority for tower placement.
 */
export function getRowPriority(): readonly number[] {
  return ROW_PRIORITY;
}

/**
 * Spend coins on upgrading existing towers.
 * Prioritizes lowest-level towers first (fewer strong > many weak).
 * Loops until no more upgrades are affordable.
 *
 * @param filterTowerId - If set, only upgrade towers of this type.
 */
export function spendOnUpgrades(
  state: SimState,
  towers: TowerDefinition[],
  settings: GameSettings,
  budget: number,
  filterTowerId?: number,
): { actions: StrategyAction[]; remaining: number } {
  const actions: StrategyAction[] = [];
  let remaining = budget;

  // Track effective levels (supports multiple upgrades per tower per wave)
  const effectiveLevels = new Map<number, number>();
  for (const t of state.towers) {
    effectiveLevels.set(t.id, t.level);
  }

  let madeProgress = true;
  while (madeProgress && remaining > 0) {
    madeProgress = false;

    // Find the lowest-level tower with an affordable upgrade
    let bestId: number | null = null;
    let bestCost = Infinity;
    let bestEffectiveLevel = Infinity;

    for (const tower of state.towers) {
      if (filterTowerId != null && tower.towerId !== filterTowerId) continue;

      const towerDef = towers.find((t) => t.id === tower.towerId);
      if (!towerDef) continue;

      const currentLevel = effectiveLevels.get(tower.id) ?? tower.level;
      const nextLevelDef = towerDef.levels.find(
        (l) => l.level === currentLevel + 1,
      );
      if (!nextLevelDef) continue;

      const cost = Math.round(
        nextLevelDef.cost * settings.towerCostMultiplier,
      );
      if (cost > remaining) continue;

      // Prefer lowest-level tower; tie-break by cheapest cost
      if (
        currentLevel < bestEffectiveLevel ||
        (currentLevel === bestEffectiveLevel && cost < bestCost)
      ) {
        bestId = tower.id;
        bestCost = cost;
        bestEffectiveLevel = currentLevel;
      }
    }

    if (bestId != null) {
      actions.push({
        type: 'upgrade',
        targetTowerInstanceId: bestId,
      });
      remaining -= bestCost;
      effectiveLevels.set(bestId, bestEffectiveLevel + 1);
      madeProgress = true;
    }
  }

  return { actions, remaining };
}

/**
 * Build new towers using row/column priority.
 * Uses the strategy's tower picker to decide which tower type to build.
 */
export function spendOnBuilds(
  state: SimState,
  settings: GameSettings,
  budget: number,
  previousActions: StrategyAction[],
  pickTower: (
    pendingUsage: Record<number, number>,
  ) => TowerDefinition | undefined,
): { actions: StrategyAction[]; remaining: number } {
  const actions: StrategyAction[] = [];
  let remaining = budget;
  const rows = getRowPriority();
  const cols = getColumnPriority();

  // Track occupied cells (existing towers + pending builds)
  const occupied = new Set<string>();
  for (const t of state.towers) {
    occupied.add(`${t.gridX},${t.gridY}`);
  }
  for (const a of previousActions) {
    if (a.type === 'build' && a.gridX != null && a.gridY != null) {
      occupied.add(`${a.gridX},${a.gridY}`);
    }
  }

  // Track pending tower usage counts
  const pendingUsage: Record<number, number> = {};
  for (const [key, val] of Object.entries(state.towerUsage)) {
    pendingUsage[Number(key)] = val;
  }
  for (const a of previousActions) {
    if (a.type === 'build' && a.towerId != null) {
      pendingUsage[a.towerId] = (pendingUsage[a.towerId] ?? 0) + 1;
    }
  }

  for (const row of rows) {
    for (const col of cols) {
      if (remaining <= 0) return { actions, remaining };

      const key = `${col},${row}`;
      if (occupied.has(key)) continue;

      const towerDef = pickTower(pendingUsage);
      if (!towerDef) return { actions, remaining };

      const level1 = towerDef.levels.find((l) => l.level === 1);
      if (!level1) continue;

      const cost = Math.round(level1.cost * settings.towerCostMultiplier);
      if (remaining < cost) continue;

      actions.push({
        type: 'build',
        towerId: towerDef.id,
        gridX: col,
        gridY: row,
      });
      remaining -= cost;
      occupied.add(key);
      pendingUsage[towerDef.id] = (pendingUsage[towerDef.id] ?? 0) + 1;
    }
  }

  return { actions, remaining };
}

/**
 * Pick the least-used tower type for even distribution.
 */
export function pickLeastUsed(
  towers: TowerDefinition[],
  usage: Record<number, number>,
  excludeId?: number,
): TowerDefinition | undefined {
  let minCount = Infinity;
  let selected: TowerDefinition | undefined;

  for (const towerDef of towers) {
    if (excludeId != null && towerDef.id === excludeId) continue;
    const count = usage[towerDef.id] ?? 0;
    if (count < minCount) {
      minCount = count;
      selected = towerDef;
    }
  }

  return selected;
}
