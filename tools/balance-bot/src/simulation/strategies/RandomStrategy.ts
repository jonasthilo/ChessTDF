import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';
import { spendOnBuilds } from './PlacementUtils';

/**
 * Random strategy: picks random tower types but uses smart placement
 * (close to path, center columns). Builds only, no upgrades.
 * Serves as a "quantity over quality" baseline.
 */
export class RandomStrategy implements Strategy {
  readonly name = 'random';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    if (towers.length === 0) return [];

    // Build as many random towers as affordable using smart placement
    const builds = spendOnBuilds(
      state,
      settings,
      state.coins,
      [],
      () => towers[Math.floor(Math.random() * towers.length)],
    );

    return builds.actions;
  }
}
