import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';
import {
  spendOnUpgrades,
  spendOnBuilds,
  pickLeastUsed,
} from './PlacementUtils';

/**
 * Sniper-heavy strategy: prioritizes the highest-range tower type.
 * 1. Build snipers for coverage (50% budget)
 * 2. Upgrade sniper towers first, then others
 * 3. Fill remaining with other tower types
 * Snipers benefit from range, so upgrades are valuable but coverage is needed first.
 */
export class SniperHeavyStrategy implements Strategy {
  readonly name = 'sniper-heavy';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    if (towers.length === 0) return [];

    const sniperDef = this.findHighestRangeTower(towers);
    if (!sniperDef) return [];

    const buildBudget = Math.floor(state.coins * 0.5);
    const upgradeBudget = state.coins - buildBudget;

    // Phase 1: Build snipers for coverage
    const sniperBuilds = spendOnBuilds(
      state,
      settings,
      buildBudget,
      [],
      () => sniperDef,
    );

    // Phase 2: Upgrade sniper towers first
    const upgradeTotal = upgradeBudget + sniperBuilds.remaining;
    const sniperUpgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      upgradeTotal,
      sniperDef.id,
    );

    // Phase 3: Upgrade other towers
    const otherUpgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      sniperUpgrades.remaining,
    );

    // Phase 4: Fill remaining with other tower types
    const allActions = [
      ...sniperBuilds.actions,
      ...sniperUpgrades.actions,
      ...otherUpgrades.actions,
    ];
    const fillBuilds = spendOnBuilds(
      state,
      settings,
      otherUpgrades.remaining,
      allActions,
      (usage) => pickLeastUsed(towers, usage, sniperDef.id),
    );

    return [...allActions, ...fillBuilds.actions];
  }

  private findHighestRangeTower(
    towers: TowerDefinition[],
  ): TowerDefinition | undefined {
    let best: TowerDefinition | undefined;
    let bestRange = -Infinity;

    for (const tower of towers) {
      const level1 = tower.levels.find((l) => l.level === 1);
      if (!level1) continue;

      if (level1.range > bestRange) {
        bestRange = level1.range;
        best = tower;
      }
    }

    return best;
  }
}
