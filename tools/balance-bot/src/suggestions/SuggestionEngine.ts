import type {
  Tier1Results,
  Tier2Results,
  Tier3Results,
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  BalanceSuggestion,
  IssueSeverity,
  BalanceIssue,
} from '../types';
import { clampToConstraint } from './ConstraintValidator';

const MAX_CHANGE_PERCENT = 30;

// --- Helpers ---

function capChangePercent(percent: number): number {
  return Math.max(-MAX_CHANGE_PERCENT, Math.min(MAX_CHANGE_PERCENT, percent));
}

function roundForField(table: string, field: string, value: number): number {
  const decimalFields = new Set([
    'fireRate',
    'towerCostMultiplier',
    'enemyHealthMultiplier',
    'enemySpeedMultiplier',
    'enemyRewardMultiplier',
    'enemyHealthWaveMultiplier',
    'enemyRewardWaveMultiplier',
  ]);
  if (decimalFields.has(field)) {
    return parseFloat(value.toFixed(2));
  }
  return Math.round(value);
}

function computeChangePercent(
  currentValue: number,
  suggestedValue: number,
): number {
  if (currentValue === 0) return 0;
  return ((suggestedValue - currentValue) / currentValue) * 100;
}

function buildApiPatchInfo(suggestion: {
  target: { table: string; id: number; field: string; level?: number };
  suggestedValue: number;
}): { method: string; url: string; body: Record<string, unknown> } {
  const { table, id, field, level } = suggestion.target;

  if (table === 'tower_levels' && level != null) {
    return {
      method: 'PUT',
      url: `/api/config/towers/${id}/levels/${level}`,
      body: { [field]: suggestion.suggestedValue },
    };
  }

  if (table === 'enemy_definitions') {
    return {
      method: 'PATCH',
      url: `/api/config/enemies/${id}`,
      body: { [field]: suggestion.suggestedValue },
    };
  }

  if (table === 'game_settings') {
    return {
      method: 'PATCH',
      url: `/api/config/settings/${id}`,
      body: { [field]: suggestion.suggestedValue },
    };
  }

  // tower_definitions fallback
  return {
    method: 'PATCH',
    url: `/api/config/towers/${id}`,
    body: { [field]: suggestion.suggestedValue },
  };
}

function buildRollbackSQLString(suggestion: {
  target: { table: string; id: number; field: string; level?: number };
  currentValue: number;
}): string {
  const { table, id, field, level } = suggestion.target;

  if (table === 'tower_levels' && level != null) {
    return `UPDATE tower_levels SET ${field} = ${suggestion.currentValue} WHERE tower_id = ${id} AND level = ${level}`;
  }

  const idColumn = table === 'game_settings' ? 'id' : 'id';
  return `UPDATE ${table} SET ${field} = ${suggestion.currentValue} WHERE ${idColumn} = ${id}`;
}

function makeSuggestion(params: {
  priority: IssueSeverity;
  description: string;
  table: string;
  id: number;
  field: string;
  level?: number;
  currentValue: number;
  rawSuggestedValue: number;
  reasoning: string;
}): BalanceSuggestion {
  const {
    priority,
    description,
    table,
    id,
    field,
    level,
    currentValue,
    rawSuggestedValue,
    reasoning,
  } = params;

  // Round for the field type
  let suggestedValue = roundForField(table, field, rawSuggestedValue);

  // Clamp to constraints
  suggestedValue = clampToConstraint(table, field, suggestedValue);

  // Re-round after clamping (clamping may not affect rounding, but be safe)
  suggestedValue = roundForField(table, field, suggestedValue);

  // Compute change percent and cap it
  let changePercent = computeChangePercent(currentValue, suggestedValue);

  // If change exceeds cap, recalculate suggestedValue from capped percent
  if (Math.abs(changePercent) > MAX_CHANGE_PERCENT) {
    const cappedPercent = capChangePercent(changePercent);
    suggestedValue = roundForField(
      table,
      field,
      currentValue * (1 + cappedPercent / 100),
    );
    suggestedValue = clampToConstraint(table, field, suggestedValue);
    suggestedValue = roundForField(table, field, suggestedValue);
    changePercent = computeChangePercent(currentValue, suggestedValue);
  }

  const target = { table, id, field, ...(level != null ? { level } : {}) };
  const apiPatch = buildApiPatchInfo({ target, suggestedValue });
  const rollbackSQL = buildRollbackSQLString({ target, currentValue });

  return {
    priority,
    description,
    target,
    currentValue,
    suggestedValue,
    changePercent: parseFloat(changePercent.toFixed(1)),
    reasoning,
    apiPatch,
    rollbackSQL,
  };
}

// --- Tier 1 Suggestion Generators ---

function suggestionsFromTier1(
  tier1: Tier1Results,
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  const suggestions: BalanceSuggestion[] = [];

  for (const issue of tier1.issues) {
    switch (issue.category) {
      case 'dps-cost-spread':
        suggestions.push(
          ...handleDpsCostSpread(issue, towers, settings),
        );
        break;
      case 'overkill':
        suggestions.push(
          ...handleOverkill(issue, enemies, settings),
        );
        break;
      case 'unkillable':
        suggestions.push(
          ...handleUnkillable(issue, towers, enemies, settings),
        );
        break;
    }
  }

  return suggestions;
}

function handleDpsCostSpread(
  issue: BalanceIssue,
  towers: TowerDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  if (issue.severity !== 'high') return [];

  const details = issue.details as {
    level: number;
    maxDpc: number;
    minDpc: number;
    ratio: number;
  };

  const level = details.level;
  const meanDpc = (details.maxDpc + details.minDpc) / 2;

  const suggestions: BalanceSuggestion[] = [];

  // Find the outlier tower(s) -- adjust the most expensive one (lowest DPS/coin)
  // toward the mean by adjusting its cost
  for (const tower of towers) {
    const levelDef = tower.levels.find((l) => l.level === level);
    if (!levelDef) continue;

    const dps = levelDef.damage * levelDef.fireRate;
    const adjustedCost = levelDef.cost * settings.towerCostMultiplier;
    const cumulativeCost = adjustedCost; // For level 1, cumulative = direct
    const dpsPerCoin = cumulativeCost > 0 ? dps / cumulativeCost : 0;

    // If this tower has the worst DPS/coin (closest to minDpc), suggest reducing cost
    if (
      dpsPerCoin > 0 &&
      Math.abs(dpsPerCoin - details.minDpc) < 0.001
    ) {
      // Target cost where dpsPerCoin equals meanDpc
      // dps / newCost = meanDpc => newCost = dps / meanDpc
      // But cost in the DB is before multiplier, so:
      // dps / (newRawCost * multiplier) = meanDpc => newRawCost = dps / (meanDpc * multiplier)
      const targetRawCost =
        settings.towerCostMultiplier > 0
          ? dps / (meanDpc * settings.towerCostMultiplier)
          : levelDef.cost;

      suggestions.push(
        makeSuggestion({
          priority: 'high',
          description: `Adjust ${tower.name} level ${level} cost to improve DPS/coin balance`,
          table: 'tower_levels',
          id: tower.id,
          field: 'cost',
          level,
          currentValue: levelDef.cost,
          rawSuggestedValue: targetRawCost,
          reasoning: `DPS/coin spread is ${details.ratio.toFixed(1)}x at level ${level}. Adjusting cost toward the mean DPS/coin ratio to reduce imbalance.`,
        }),
      );
    }
  }

  return suggestions;
}

function handleOverkill(
  issue: BalanceIssue,
  enemies: EnemyDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  const details = issue.details as {
    towerId: number;
    towerLevel: number;
    enemyId: number;
    wave: number;
    overkillRatio: number;
  };

  if (details.overkillRatio <= 3.0) return [];

  const enemy = enemies.find((e) => e.id === details.enemyId);
  if (!enemy) return [];

  // Suggest increasing enemy health by 15%
  const newHealth = enemy.health * 1.15;

  return [
    makeSuggestion({
      priority: 'medium',
      description: `Increase ${enemy.name} health to reduce overkill ratio`,
      table: 'enemy_definitions',
      id: enemy.id,
      field: 'health',
      currentValue: enemy.health,
      rawSuggestedValue: newHealth,
      reasoning: `Overkill ratio of ${details.overkillRatio.toFixed(1)}x at wave ${details.wave} wastes tower damage. Increasing health reduces waste.`,
    }),
  ];
}

function handleUnkillable(
  issue: BalanceIssue,
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  const details = issue.details as {
    enemyId: number;
    wave: number;
    towersTested: string[];
  };

  const enemy = enemies.find((e) => e.id === details.enemyId);
  if (!enemy) return [];

  const suggestions: BalanceSuggestion[] = [];

  // Option 1: Reduce enemy speed by 15%
  const newSpeed = enemy.speed * 0.85;
  suggestions.push(
    makeSuggestion({
      priority: 'critical',
      description: `Reduce ${enemy.name} speed so towers can kill it before escape`,
      table: 'enemy_definitions',
      id: enemy.id,
      field: 'speed',
      currentValue: enemy.speed,
      rawSuggestedValue: newSpeed,
      reasoning: `No level-1 tower can kill ${enemy.name} before it exits range at wave ${details.wave}. Reducing speed gives towers more engagement time.`,
    }),
  );

  // Option 2: Increase tower range by 10% for the tower with the best range
  const bestRangeTower = towers.reduce<TowerDefinition | null>(
    (best, tower) => {
      const level1 = tower.levels.find((l) => l.level === 1);
      if (!level1) return best;
      const bestLevel1 = best?.levels.find((l) => l.level === 1);
      if (!bestLevel1) return tower;
      return level1.range > bestLevel1.range ? tower : best;
    },
    null,
  );

  if (bestRangeTower) {
    const level1 = bestRangeTower.levels.find((l) => l.level === 1);
    if (level1) {
      const newRange = level1.range * 1.10;
      suggestions.push(
        makeSuggestion({
          priority: 'critical',
          description: `Increase ${bestRangeTower.name} level 1 range to cover ${enemy.name}`,
          table: 'tower_levels',
          id: bestRangeTower.id,
          field: 'range',
          level: 1,
          currentValue: level1.range,
          rawSuggestedValue: newRange,
          reasoning: `No level-1 tower can kill ${enemy.name} before escape at wave ${details.wave}. Increasing range extends engagement window.`,
        }),
      );
    }
  }

  return suggestions;
}

// --- Tier 2 Suggestion Generators ---

function suggestionsFromTier2(
  tier2: Tier2Results,
  settings: GameSettings,
): BalanceSuggestion[] {
  const suggestions: BalanceSuggestion[] = [];

  for (const issue of tier2.issues) {
    switch (issue.category) {
      case 'impossible-wave':
        suggestions.push(
          ...handleImpossibleWave(issue, settings),
        );
        break;
      case 'difficulty-spike':
        suggestions.push(
          ...handleDifficultySpike(issue, settings),
        );
        break;
      // trivial-wave: no action needed (informational only)
      // economy-stall: could generate suggestions but not specified
    }
  }

  return suggestions;
}

function handleImpossibleWave(
  issue: BalanceIssue,
  settings: GameSettings,
): BalanceSuggestion[] {
  const suggestions: BalanceSuggestion[] = [];

  // Option 1: Reduce enemyHealthWaveMultiplier by 10%
  const currentHealthWaveMultiplier = settings.enemyHealthWaveMultiplier;
  const newHealthWaveMultiplier = currentHealthWaveMultiplier * 0.90;

  suggestions.push(
    makeSuggestion({
      priority: 'critical',
      description: `Reduce enemy health wave scaling to make waves achievable`,
      table: 'game_settings',
      id: settings.id,
      field: 'enemyHealthWaveMultiplier',
      currentValue: currentHealthWaveMultiplier,
      rawSuggestedValue: newHealthWaveMultiplier,
      reasoning: `${issue.description}. Reducing health wave multiplier lowers enemy HP growth per wave.`,
    }),
  );

  // Option 2: Increase enemyRewardWaveMultiplier by 10%
  const currentRewardWaveMultiplier = settings.enemyRewardWaveMultiplier;
  const newRewardWaveMultiplier = currentRewardWaveMultiplier * 1.10;

  suggestions.push(
    makeSuggestion({
      priority: 'critical',
      description: `Increase enemy reward wave scaling to improve economy`,
      table: 'game_settings',
      id: settings.id,
      field: 'enemyRewardWaveMultiplier',
      currentValue: currentRewardWaveMultiplier,
      rawSuggestedValue: newRewardWaveMultiplier,
      reasoning: `${issue.description}. Increasing reward wave multiplier gives players more coins per wave to afford better defenses.`,
    }),
  );

  return suggestions;
}

function handleDifficultySpike(
  issue: BalanceIssue,
  settings: GameSettings,
): BalanceSuggestion[] {
  // Suggest reducing health multiplier by 5% to smooth the curve
  const currentHealthMultiplier = settings.enemyHealthMultiplier;
  const newHealthMultiplier = currentHealthMultiplier * 0.95;

  return [
    makeSuggestion({
      priority: 'high',
      description: `Reduce enemy health multiplier to smooth difficulty curve`,
      table: 'game_settings',
      id: settings.id,
      field: 'enemyHealthMultiplier',
      currentValue: currentHealthMultiplier,
      rawSuggestedValue: newHealthMultiplier,
      reasoning: `${issue.description}. Reducing the base health multiplier smooths the difficulty progression.`,
    }),
  ];
}

// --- Tier 3 Suggestion Generators ---

function suggestionsFromTier3(
  tier3: Tier3Results,
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  const suggestions: BalanceSuggestion[] = [];

  // Tower pick rate imbalances
  for (const [towerIdStr, rate] of Object.entries(tier3.towerPickRate)) {
    const towerId = Number(towerIdStr);
    const tower = towers.find((t) => t.id === towerId);
    if (!tower) continue;

    const level1 = tower.levels.find((l) => l.level === 1);
    if (!level1) continue;

    if (rate > 0.6) {
      // Tower pick rate > 60%: nerf by increasing cost 15%
      const newCost = level1.cost * 1.15;
      suggestions.push(
        makeSuggestion({
          priority: 'high',
          description: `Increase ${tower.name} level 1 cost to reduce dominance (${(rate * 100).toFixed(0)}% pick rate)`,
          table: 'tower_levels',
          id: tower.id,
          field: 'cost',
          level: 1,
          currentValue: level1.cost,
          rawSuggestedValue: newCost,
          reasoning: `${tower.name} has a ${(rate * 100).toFixed(0)}% pick rate across simulations, indicating it is too cost-effective relative to alternatives.`,
        }),
      );
    } else if (rate < 0.1) {
      // Tower pick rate < 10%: buff by decreasing cost 15%
      const newCost = level1.cost * 0.85;
      suggestions.push(
        makeSuggestion({
          priority: 'medium',
          description: `Decrease ${tower.name} level 1 cost to improve viability (${(rate * 100).toFixed(0)}% pick rate)`,
          table: 'tower_levels',
          id: tower.id,
          field: 'cost',
          level: 1,
          currentValue: level1.cost,
          rawSuggestedValue: newCost,
          reasoning: `${tower.name} has only a ${(rate * 100).toFixed(0)}% pick rate across simulations, suggesting it is too expensive or weak compared to alternatives.`,
        }),
      );
    }
  }

  // Enemy leak rate > 50%
  for (const [enemyIdStr, rate] of Object.entries(tier3.enemyLeakRate)) {
    if (rate <= 0.5) continue;

    const enemyId = Number(enemyIdStr);
    const enemy = enemies.find((e) => e.id === enemyId);
    if (!enemy) continue;

    // Suggest reducing speed by 10%
    const newSpeed = enemy.speed * 0.90;
    suggestions.push(
      makeSuggestion({
        priority: 'high',
        description: `Reduce ${enemy.name} speed to lower leak rate (${(rate * 100).toFixed(0)}%)`,
        table: 'enemy_definitions',
        id: enemy.id,
        field: 'speed',
        currentValue: enemy.speed,
        rawSuggestedValue: newSpeed,
        reasoning: `${enemy.name} escapes ${(rate * 100).toFixed(0)}% of the time in simulations. Reducing speed gives towers more time to kill it.`,
      }),
    );
  }

  return suggestions;
}

// --- Deduplication ---

function deduplicateSuggestions(
  suggestions: BalanceSuggestion[],
): BalanceSuggestion[] {
  // If multiple suggestions target the same table.id.field.level,
  // keep the one with the highest priority (lowest severity ordinal).
  const severityOrder: Record<IssueSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  const map = new Map<string, BalanceSuggestion>();

  for (const s of suggestions) {
    const key = `${s.target.table}.${s.target.id}.${s.target.field}.${s.target.level ?? ''}`;
    const existing = map.get(key);

    if (
      !existing ||
      severityOrder[s.priority] < severityOrder[existing.priority]
    ) {
      map.set(key, s);
    }
  }

  return [...map.values()];
}

// --- Main Export ---

export function generateSuggestions(
  tier1: Tier1Results | null,
  tier2: Tier2Results | null,
  tier3: Tier3Results | null,
  towers: TowerDefinition[],
  enemies: EnemyDefinition[],
  settings: GameSettings,
): BalanceSuggestion[] {
  const allSuggestions: BalanceSuggestion[] = [];

  if (tier1) {
    allSuggestions.push(
      ...suggestionsFromTier1(tier1, towers, enemies, settings),
    );
  }

  if (tier2) {
    allSuggestions.push(
      ...suggestionsFromTier2(tier2, settings),
    );
  }

  if (tier3) {
    allSuggestions.push(
      ...suggestionsFromTier3(tier3, towers, enemies, settings),
    );
  }

  // Filter out no-op suggestions (where suggested === current)
  const meaningful = allSuggestions.filter(
    (s) => s.suggestedValue !== s.currentValue,
  );

  return deduplicateSuggestions(meaningful);
}
