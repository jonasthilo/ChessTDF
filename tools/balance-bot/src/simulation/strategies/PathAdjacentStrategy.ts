import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';
import {
  spendOnUpgrades,
  spendOnBuilds,
  pickLeastUsed,
} from './PlacementUtils';

/**
 * PathAdjacent strategy: most aggressive spender, coverage-heavy.
 * 1. Build towers first (70% budget for maximum coverage)
 * 2. Upgrade existing towers
 * 3. Build more with leftovers
 * Prioritizes flooding the path with towers.
 */
export class PathAdjacentStrategy implements Strategy {
  readonly name = 'path-adjacent';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    if (towers.length === 0) return [];

    const buildBudget = Math.floor(state.coins * 0.7);
    const upgradeBudget = state.coins - buildBudget;

    // Phase 1: Build towers aggressively (even mix)
    const builds = spendOnBuilds(
      state,
      settings,
      buildBudget,
      [],
      (usage) => pickLeastUsed(towers, usage),
    );

    // Phase 2: Upgrade with remaining budget
    const upgradeTotal = upgradeBudget + builds.remaining;
    const upgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      upgradeTotal,
    );

    // Phase 3: Build more with leftovers
    const allActions = [...builds.actions, ...upgrades.actions];
    const finalBuilds = spendOnBuilds(
      state,
      settings,
      upgrades.remaining,
      allActions,
      (usage) => pickLeastUsed(towers, usage),
    );

    return [...allActions, ...finalBuilds.actions];
  }
}
