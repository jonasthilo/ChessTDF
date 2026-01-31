import type {
  Tier1Results,
  Tier2Results,
  Tier3Results,
  BalanceSuggestion,
  ClassifiedTower,
  ClassifiedEnemy,
  SimulationRunResult,
} from '../types';

export class JsonReporter {
  reportTier1(results: Tier1Results): void {
    console.log(JSON.stringify({ tier: 1, ...results }, null, 2));
  }

  reportTier2(results: Tier2Results): void {
    console.log(JSON.stringify({ tier: 2, ...results }, null, 2));
  }

  reportTier3(results: Tier3Results): void {
    console.log(JSON.stringify({ tier: 3, ...results }, null, 2));
  }

  reportSuggestions(suggestions: BalanceSuggestion[]): void {
    console.log(JSON.stringify({ suggestions }, null, 2));
  }

  reportClassification(
    towers: ClassifiedTower[],
    enemies: ClassifiedEnemy[],
  ): void {
    console.log(
      JSON.stringify({ classification: { towers, enemies } }, null, 2),
    );
  }

  reportSimulation(result: SimulationRunResult): void {
    console.log(JSON.stringify({ simulation: result }, null, 2));
  }
}
