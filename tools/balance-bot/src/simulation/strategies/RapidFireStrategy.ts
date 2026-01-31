import type { TowerDefinition, GameSettings } from '../../types';
import type { SimState, Strategy, StrategyAction } from '../SimulationTypes';
import {
  spendOnUpgrades,
  spendOnBuilds,
  pickLeastUsed,
} from './PlacementUtils';

/**
 * Rapid-fire strategy: prioritizes the highest-fireRate tower type.
 * 1. Build rapid towers for coverage (50% budget)
 * 2. Upgrade rapid towers first, then others
 * 3. Fill remaining with other tower types
 * Rapid towers benefit from fire rate upgrades but need coverage first.
 */
export class RapidFireStrategy implements Strategy {
  readonly name = 'rapid-fire';

  decideActions(
    state: SimState,
    towers: TowerDefinition[],
    settings: GameSettings,
  ): StrategyAction[] {
    if (towers.length === 0) return [];

    const rapidDef = this.findHighestFireRateTower(towers);
    if (!rapidDef) return [];

    const buildBudget = Math.floor(state.coins * 0.5);
    const upgradeBudget = state.coins - buildBudget;

    // Phase 1: Build rapid towers for coverage
    const rapidBuilds = spendOnBuilds(
      state,
      settings,
      buildBudget,
      [],
      () => rapidDef,
    );

    // Phase 2: Upgrade rapid towers first
    const upgradeTotal = upgradeBudget + rapidBuilds.remaining;
    const rapidUpgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      upgradeTotal,
      rapidDef.id,
    );

    // Phase 3: Upgrade other towers
    const otherUpgrades = spendOnUpgrades(
      state,
      towers,
      settings,
      rapidUpgrades.remaining,
    );

    // Phase 4: Fill remaining with other tower types
    const allActions = [
      ...rapidBuilds.actions,
      ...rapidUpgrades.actions,
      ...otherUpgrades.actions,
    ];
    const fillBuilds = spendOnBuilds(
      state,
      settings,
      otherUpgrades.remaining,
      allActions,
      (usage) => pickLeastUsed(towers, usage, rapidDef.id),
    );

    return [...allActions, ...fillBuilds.actions];
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
}
