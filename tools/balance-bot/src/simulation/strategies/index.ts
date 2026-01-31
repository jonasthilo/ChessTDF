import type { Strategy } from '../SimulationTypes';
import { RandomStrategy } from './RandomStrategy';
import { PathAdjacentStrategy } from './PathAdjacentStrategy';
import { BalancedStrategy } from './BalancedStrategy';

export { RandomStrategy, PathAdjacentStrategy, BalancedStrategy };

const STRATEGIES: Record<string, () => Strategy> = {
  random: () => new RandomStrategy(),
  'path-adjacent': () => new PathAdjacentStrategy(),
  balanced: () => new BalancedStrategy(),
};

export function getStrategy(name: string): Strategy {
  const factory = STRATEGIES[name];
  if (!factory) {
    const valid = getAllStrategyNames().join(', ');
    throw new Error(`Unknown strategy "${name}". Valid: ${valid}`);
  }
  return factory();
}

export function getAllStrategyNames(): string[] {
  return ['random', 'path-adjacent', 'balanced'];
}
