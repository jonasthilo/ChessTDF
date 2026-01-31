import { GAME_CONSTANTS } from '../../types';
import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';

/**
 * Random strategy: picks a random tower type and places it on a random valid cell.
 * Builds if affordable. No upgrades or selling.
 */
export class RandomStrategy implements Strategy {
  readonly name = 'random';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    const actions: StrategyAction[] = [];
    if (towers.length === 0) return actions;

    const validCells = this.getValidCells(state);
    if (validCells.length === 0) return actions;

    // Try to build one tower per wave decision
    const towerDef = towers[Math.floor(Math.random() * towers.length)]!;
    const level1 = towerDef.levels.find((l) => l.level === 1);
    if (!level1) return actions;

    const cost = Math.round(level1.cost * settings.towerCostMultiplier);
    if (state.coins < cost) return actions;

    const cell = validCells[Math.floor(Math.random() * validCells.length)]!;

    actions.push({
      type: 'build',
      towerId: towerDef.id,
      gridX: cell.x,
      gridY: cell.y,
    });

    return actions;
  }

  private getValidCells(
    state: SimState,
  ): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < GAME_CONSTANTS.GRID_ROWS; y++) {
      if (GAME_CONSTANTS.RESTRICTED_ROWS.includes(y)) continue;
      for (let x = 0; x < GAME_CONSTANTS.GRID_COLS; x++) {
        const occupied = state.towers.some(
          (t) => t.gridX === x && t.gridY === y,
        );
        if (!occupied) {
          cells.push({ x, y });
        }
      }
    }

    return cells;
  }
}
