import chalk from 'chalk';
import type { ApiClient } from '../api/client';
import type { BalanceSuggestion } from '../types';

export function buildApiPatch(
  suggestion: BalanceSuggestion,
): { method: string; url: string; body: Record<string, unknown> } {
  return { ...suggestion.apiPatch };
}

export function buildRollbackSQL(suggestion: BalanceSuggestion): string {
  return suggestion.rollbackSQL;
}

export async function applySuggestions(
  client: ApiClient,
  suggestions: BalanceSuggestion[],
): Promise<void> {
  if (suggestions.length === 0) {
    console.log(chalk.green('No suggestions to apply.'));
    return;
  }

  console.log(
    chalk.bold(`\nApplying ${suggestions.length} suggestion(s)...\n`),
  );

  let applied = 0;
  let failed = 0;

  for (const suggestion of suggestions) {
    const { table, id, field, level } = suggestion.target;
    const label = `${table}.${field} (id=${id}${level != null ? `, level=${level}` : ''})`;

    try {
      if (table === 'tower_levels' && level != null) {
        await client.putTowerLevel(id, level, {
          [field]: suggestion.suggestedValue,
        });
      } else if (table === 'enemy_definitions') {
        await client.patchEnemy(id, {
          [field]: suggestion.suggestedValue,
        });
      } else if (table === 'game_settings') {
        await client.patchSettings(id, {
          [field]: suggestion.suggestedValue,
        });
      } else {
        // tower_definitions
        await client.patchTower(id, {
          [field]: suggestion.suggestedValue,
        });
      }

      console.log(
        chalk.green(`  [OK] ${label}: ${suggestion.currentValue} -> ${suggestion.suggestedValue}`),
      );
      applied++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(chalk.red(`  [FAIL] ${label}: ${msg}`));
      failed++;
    }
  }

  console.log('');
  console.log(
    chalk.bold(
      `Applied: ${applied}, Failed: ${failed}, Total: ${suggestions.length}`,
    ),
  );

  if (failed > 0) {
    console.log('');
    console.log(chalk.yellow('Rollback SQL for failed suggestions:'));
    for (const suggestion of suggestions) {
      console.log(chalk.gray(`  ${suggestion.rollbackSQL};`));
    }
  }
}

export function printDryRun(suggestions: BalanceSuggestion[]): void {
  if (suggestions.length === 0) {
    console.log(chalk.green('No API calls to make.'));
    return;
  }

  console.log(chalk.bold('\n--- Dry Run: API Calls ---\n'));

  for (const suggestion of suggestions) {
    const patch = buildApiPatch(suggestion);
    console.log(
      `  ${patch.method} ${patch.url}`,
    );
    console.log(
      chalk.gray(`    Body: ${JSON.stringify(patch.body)}`),
    );
    console.log(
      chalk.gray(`    Rollback: ${buildRollbackSQL(suggestion)}`),
    );
    console.log('');
  }
}
