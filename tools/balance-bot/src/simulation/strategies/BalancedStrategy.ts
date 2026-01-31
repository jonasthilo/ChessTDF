import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';
import {
  spendOnUpgrades,
  spendOnBuilds,
  pickLeastUsed,
} from './PlacementUtils';

/**
 * Balanced strategy: builds coverage first, then upgrades, even tower mix.
 * 1. Build new towers to expand coverage (up to 60% of budget)
 * 2. Upgrade existing towers (lowest level first)
 * 3. Build more if coins remain
 * Balances coverage (quantity) with tower strength (quality).
 */
export class BalancedStrategy implements Strategy {
  readonly name = 'balanced';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    if (towers.length === 0) return [];

    const buildBudget = Math.floor(state.coins * 0.6);
    const upgradeBudget = state.coins - buildBudget;

    // Phase 1: Build towers for coverage (even mix)
    const builds = spendOnBuilds(
      state,
      settings,
      buildBudget,
      [],
      (usage) => pickLeastUsed(towers, usage),
    );

    // Phase 2: Upgrade existing towers with upgrade budget + unspent build budget
    const upgradeTotal = upgradeBudget + builds.remaining;
    const upgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      upgradeTotal,
    );

    // Phase 3: Build more with any remaining coins
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
