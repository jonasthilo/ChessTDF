import chalk from 'chalk';
import type {
  Tier1Results,
  Tier2Results,
  Tier3Results,
  BalanceSuggestion,
  BalanceIssue,
  ClassifiedTower,
  ClassifiedEnemy,
  IssueSeverity,
} from '../types';

function severityColor(severity: IssueSeverity): (text: string) => string {
  switch (severity) {
    case 'critical':
      return chalk.red;
    case 'high':
      return chalk.yellow;
    case 'medium':
      return chalk.cyan;
    case 'low':
      return chalk.gray;
  }
}

function severityLabel(severity: IssueSeverity): string {
  return severityColor(severity)(`[${severity.toUpperCase()}]`);
}

function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : ' '.repeat(width - text.length) + text;
}

function printHeader(title: string): void {
  const line = '='.repeat(60);
  console.log('');
  console.log(chalk.bold(line));
  console.log(chalk.bold(`  ${title}`));
  console.log(chalk.bold(line));
}

function printSubHeader(title: string): void {
  console.log('');
  console.log(chalk.bold(`--- ${title} ---`));
}

function printIssues(issues: BalanceIssue[]): void {
  if (issues.length === 0) {
    console.log(chalk.green('  No balance issues detected.'));
    return;
  }

  const sorted = [...issues].sort((a, b) => {
    const order: Record<IssueSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return order[a.severity] - order[b.severity];
  });

  for (const issue of sorted) {
    console.log(`  ${severityLabel(issue.severity)} ${issue.description}`);
  }
}

export class ConsoleReporter {
  reportClassification(
    towers: ClassifiedTower[],
    enemies: ClassifiedEnemy[],
  ): void {
    printHeader('Classification');

    printSubHeader('Towers');
    const towerNameWidth = Math.max(
      ...towers.map((t) => t.name.length),
      5,
    );
    const towerRoleWidth = Math.max(
      ...towers.map((t) => t.role.length),
      4,
    );

    console.log(
      `  ${padRight('Name', towerNameWidth)}  ${padRight('Role', towerRoleWidth)}  MaxLvl`,
    );
    console.log(`  ${'-'.repeat(towerNameWidth + towerRoleWidth + 10)}`);

    for (const tower of towers) {
      console.log(
        `  ${padRight(tower.name, towerNameWidth)}  ${padRight(tower.role, towerRoleWidth)}  ${tower.maxLevel}`,
      );
    }

    printSubHeader('Enemies');
    const enemyNameWidth = Math.max(
      ...enemies.map((e) => e.name.length),
      5,
    );
    const archetypeWidth = Math.max(
      ...enemies.map((e) => e.archetype.length),
      9,
    );

    console.log(
      `  ${padRight('Name', enemyNameWidth)}  ${padRight('Archetype', archetypeWidth)}  ${padLeft('HP', 6)}  ${padLeft('Speed', 6)}  ${padLeft('Reward', 6)}`,
    );
    console.log(
      `  ${'-'.repeat(enemyNameWidth + archetypeWidth + 28)}`,
    );

    for (const enemy of enemies) {
      console.log(
        `  ${padRight(enemy.name, enemyNameWidth)}  ${padRight(enemy.archetype, archetypeWidth)}  ${padLeft(String(enemy.health), 6)}  ${padLeft(enemy.speed.toFixed(1), 6)}  ${padLeft(String(enemy.reward), 6)}`,
      );
    }
  }

  reportTier1(results: Tier1Results): void {
    printHeader('Tier 1: Cost Efficiency Analysis');

    // Tower metrics table
    printSubHeader('Tower Metrics (per level)');

    const nameWidth = Math.max(
      ...results.towerMetrics.map((m) => m.towerName.length),
      5,
    );

    console.log(
      `  ${padRight('Tower', nameWidth)}  ${padLeft('Lvl', 3)}  ${padLeft('DPS', 8)}  ${padLeft('Cost', 8)}  ${padLeft('DPS/Coin', 10)}`,
    );
    console.log(`  ${'-'.repeat(nameWidth + 35)}`);

    for (const m of results.towerMetrics) {
      console.log(
        `  ${padRight(m.towerName, nameWidth)}  ${padLeft(String(m.level), 3)}  ${padLeft(m.dps.toFixed(1), 8)}  ${padLeft(m.cumulativeCost.toFixed(0), 8)}  ${padLeft(m.dpsPerCoin.toFixed(4), 10)}`,
      );
    }

    console.log('');
    console.log(
      `  DPS/Coin spread (level 1): ${results.dpsSpread.toFixed(2)}x`,
    );

    // Matchup issues (only show problems)
    const escapeFailures = results.matchups.filter(
      (m) => !m.canKillBeforeEscape,
    );
    if (escapeFailures.length > 0) {
      printSubHeader('Escape Failures (cannot kill before enemy exits range)');
      const mNameWidth = Math.max(
        ...escapeFailures.map((m) => m.towerName.length),
        5,
      );
      const eNameWidth = Math.max(
        ...escapeFailures.map((m) => m.enemyName.length),
        5,
      );

      console.log(
        `  ${padRight('Tower', mNameWidth)}  ${padLeft('Lvl', 3)}  ${padRight('Enemy', eNameWidth)}  ${padLeft('Wave', 4)}  ${padLeft('TTK', 8)}  ${padLeft('Range T', 8)}`,
      );
      console.log(`  ${'-'.repeat(mNameWidth + eNameWidth + 33)}`);

      for (const m of escapeFailures) {
        const ttkStr = m.ttk === Infinity ? 'Inf' : m.ttk.toFixed(2);
        const rctStr =
          m.rangeCoverageTime === Infinity
            ? 'Inf'
            : m.rangeCoverageTime.toFixed(2);
        console.log(
          `  ${padRight(m.towerName, mNameWidth)}  ${padLeft(String(m.towerLevel), 3)}  ${padRight(m.enemyName, eNameWidth)}  ${padLeft(String(m.wave), 4)}  ${padLeft(ttkStr, 8)}  ${padLeft(rctStr, 8)}`,
        );
      }
    }

    // Balance issues
    printSubHeader('Balance Issues');
    printIssues(results.issues);
  }

  reportTier2(results: Tier2Results): void {
    printHeader('Tier 2: Wave Progression Analysis');

    printSubHeader('Wave Analyses');
    console.log(
      `  ${padLeft('Wave', 4)}  ${padLeft('TotalHP', 10)}  ${padLeft('Reward', 8)}  ${padLeft('MinDPS', 8)}  ${padLeft('AffDPS', 8)}  ${padLeft('Surplus', 8)}  ${padLeft('Coins', 8)}`,
    );
    console.log(`  ${'-'.repeat(62)}`);

    for (const w of results.waveAnalyses) {
      const surplusStr =
        w.surplusRatio >= 1
          ? chalk.green(w.surplusRatio.toFixed(2))
          : chalk.red(w.surplusRatio.toFixed(2));
      console.log(
        `  ${padLeft(String(w.wave), 4)}  ${padLeft(w.totalScaledHP.toFixed(0), 10)}  ${padLeft(w.totalReward.toFixed(0), 8)}  ${padLeft(w.minDPSRequired.toFixed(1), 8)}  ${padLeft(w.affordableDPS.toFixed(1), 8)}  ${padLeft(surplusStr, 8)}  ${padLeft(w.cumulativeCoins.toFixed(0), 8)}`,
      );
    }

    if (results.impossibleWaves.length > 0) {
      printSubHeader('Impossible Waves');
      for (const w of results.impossibleWaves) {
        console.log(
          chalk.red(
            `  Wave ${w.wave}: need ${w.minDPSRequired.toFixed(1)} DPS, can only afford ${w.affordableDPS.toFixed(1)} DPS`,
          ),
        );
      }
    }

    if (results.difficultySpikes.length > 0) {
      printSubHeader('Difficulty Spikes');
      for (const spike of results.difficultySpikes) {
        console.log(
          chalk.yellow(
            `  Wave ${spike.from.wave} -> ${spike.to.wave}: surplus drops ${spike.dropPercent.toFixed(0)}%`,
          ),
        );
      }
    }

    if (results.economyStallWave !== null) {
      printSubHeader('Economy');
      console.log(
        chalk.yellow(
          `  Economy stalls at wave ${results.economyStallWave}`,
        ),
      );
    }

    printSubHeader('Balance Issues');
    printIssues(results.issues);
  }

  reportTier3(results: Tier3Results): void {
    printHeader('Tier 3: Simulation Results');

    printSubHeader('Win Rates by Strategy');
    for (const [strategy, rate] of Object.entries(results.winRateByStrategy)) {
      const rateStr =
        rate >= 0.5
          ? chalk.green((rate * 100).toFixed(0) + '%')
          : chalk.red((rate * 100).toFixed(0) + '%');
      console.log(`  ${padRight(strategy, 20)}  ${rateStr}`);
    }

    printSubHeader('Tower Pick Rates');
    for (const [towerId, rate] of Object.entries(results.towerPickRate)) {
      console.log(
        `  Tower ${padLeft(towerId, 2)}:  ${(rate * 100).toFixed(1)}%`,
      );
    }

    printSubHeader('Tower Damage Share');
    for (const [towerId, share] of Object.entries(results.towerDamageShare)) {
      console.log(
        `  Tower ${padLeft(towerId, 2)}:  ${(share * 100).toFixed(1)}%`,
      );
    }

    printSubHeader('Enemy Leak Rate');
    for (const [enemyId, rate] of Object.entries(results.enemyLeakRate)) {
      const rateStr =
        rate > 0.3
          ? chalk.red((rate * 100).toFixed(1) + '%')
          : chalk.green((rate * 100).toFixed(1) + '%');
      console.log(`  Enemy ${padLeft(enemyId, 2)}:  ${rateStr}`);
    }

    if (results.sensitivity.length > 0) {
      printSubHeader('Sensitivity Analysis');
      const paramWidth = Math.max(
        ...results.sensitivity.map((s) => s.parameter.length),
        9,
      );
      const targetWidth = Math.max(
        ...results.sensitivity.map((s) => s.target.length),
        6,
      );

      console.log(
        `  ${padRight('Parameter', paramWidth)}  ${padRight('Target', targetWidth)}  ${padLeft('Impact', 8)}  Dir`,
      );
      console.log(`  ${'-'.repeat(paramWidth + targetWidth + 18)}`);

      for (const s of results.sensitivity) {
        console.log(
          `  ${padRight(s.parameter, paramWidth)}  ${padRight(s.target, targetWidth)}  ${padLeft(s.impact.toFixed(3), 8)}  ${s.direction}`,
        );
      }
    }

    printSubHeader('Balance Issues');
    printIssues(results.issues);
  }

  reportSuggestions(suggestions: BalanceSuggestion[]): void {
    printHeader('Balance Suggestions');

    if (suggestions.length === 0) {
      console.log(chalk.green('  No suggestions -- balance looks good.'));
      return;
    }

    const sorted = [...suggestions].sort((a, b) => {
      const order: Record<IssueSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return order[a.priority] - order[b.priority];
    });

    for (const s of sorted) {
      console.log('');
      console.log(
        `  ${severityLabel(s.priority)} ${s.description}`,
      );
      console.log(
        `    Target: ${s.target.table}.${s.target.field} (id=${s.target.id}${s.target.level != null ? `, level=${s.target.level}` : ''})`,
      );
      console.log(
        `    Current: ${s.currentValue} -> Suggested: ${s.suggestedValue} (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(1)}%)`,
      );
      console.log(`    Reason: ${s.reasoning}`);
      console.log(
        chalk.gray(
          `    API: ${s.apiPatch.method} ${s.apiPatch.url} ${JSON.stringify(s.apiPatch.body)}`,
        ),
      );
      console.log(chalk.gray(`    Rollback: ${s.rollbackSQL}`));
    }
  }
}
