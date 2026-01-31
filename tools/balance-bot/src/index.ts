import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from './api/client';
import { GamePlayClient } from './api/GamePlayClient';
import { classifyTowers, classifyEnemies } from './analysis/Classifier';
import { analyzeTier1 } from './analysis/Tier1CostEfficiency';
import { analyzeTier2 } from './analysis/Tier2WaveScaling';
import { analyzeTier3 } from './analysis/Tier3IterativeHITB';
import { SimulationEngine } from './simulation/SimulationEngine';
import {
  getStrategy,
  getAllStrategyNames,
} from './simulation/strategies/index';
import { ConsoleReporter } from './output/ConsoleReporter';
import { JsonReporter } from './output/JsonReporter';
import { generateSuggestions } from './suggestions/SuggestionEngine';
import { applySuggestions, printDryRun } from './suggestions/PatchGenerator';
import { GameBot } from './bot/GameBot';
import type { BotRunResult } from './bot/BotTypes';
import type { SettingsMode, GameMode } from './types';

const program = new Command();

function createReporter(format: string): ConsoleReporter | JsonReporter {
  return format === 'json' ? new JsonReporter() : new ConsoleReporter();
}

program
  .name('balance-bot')
  .description('Chess TDF Balance Analysis Tool')
  .version('0.0.0');

program
  .command('analyze')
  .description('Run balance analysis')
  .option('--tier <n>', 'Analysis tier (1, 2, 3, or all)', 'all')
  .option('--url <url>', 'Backend URL', 'http://localhost:3001')
  .option('--difficulty <d>', 'Difficulty to analyze', 'normal')
  .option('--waves <n>', 'Number of waves to analyze', '10')
  .option('--sim-runs <n>', 'Number of simulation runs per strategy (Tier 3)', '3')
  .option('--format <f>', 'Output format (console, json)', 'console')
  .option('--verbose', 'Show detailed output')
  .action(
    async (opts: {
      tier: string;
      url: string;
      difficulty: string;
      waves: string;
      simRuns: string;
      format: string;
      verbose?: boolean;
    }) => {
      const tier = opts.tier === 'all' ? null : Number(opts.tier);
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
      const simRuns = Number(opts.simRuns);
      const reporter = createReporter(opts.format);
      const client = new ApiClient(opts.url);

      // Health check
      console.log(chalk.gray(`Connecting to ${opts.url}...`));
      const healthy = await client.healthCheck();
      if (!healthy) {
        console.error(
          chalk.red(
            `Backend unreachable at ${opts.url}. Is the server running?`,
          ),
        );
        process.exit(1);
      }
      console.log(chalk.green('Backend is healthy.'));

      // Fetch data
      console.log(chalk.gray('Fetching game configuration...'));
      const [towers, enemies, settingsArr, waves] = await Promise.all([
        client.getTowers(),
        client.getEnemies(),
        client.getSettings(difficulty),
        client.getWaves(),
      ]);

      const settings = settingsArr[0];
      if (!settings) {
        console.error(
          chalk.red(`No settings found for difficulty "${difficulty}".`),
        );
        process.exit(1);
      }

      if (opts.verbose) {
        console.log(
          chalk.gray(
            `  Loaded ${towers.length} towers, ${enemies.length} enemies, settings for "${difficulty}"`,
          ),
        );
      }

      // Classification
      const classifiedTowers = classifyTowers(towers);
      const classifiedEnemies = classifyEnemies(enemies);
      reporter.reportClassification(classifiedTowers, classifiedEnemies);

      // Tier 1
      if (tier === null || tier === 1) {
        console.log(chalk.gray('\nRunning Tier 1 analysis...'));
        const tier1Results = analyzeTier1(towers, enemies, settings);
        reporter.reportTier1(tier1Results);
      }

      // Tier 2
      if (tier === null || tier === 2) {
        console.log(chalk.gray('\nRunning Tier 2 analysis...'));
        const tier2Results = analyzeTier2(
          towers,
          enemies,
          settings,
          waves,
          numWaves,
        );
        reporter.reportTier2(tier2Results);
      }

      // Tier 3
      if (tier === null || tier === 3) {
        console.log(
          chalk.gray(
            `\nRunning Tier 3 analysis (${simRuns} runs per strategy)...`,
          ),
        );
        const tier3Results = await analyzeTier3(
          towers,
          enemies,
          settings,
          waves,
          numWaves,
          simRuns,
        );
        reporter.reportTier3(tier3Results);
      }

      console.log('');
      console.log(chalk.bold('Analysis complete.'));
    },
  );

program
  .command('simulate')
  .description('Run game simulation with a tower placement strategy')
  .option(
    '--strategy <name>',
    `Strategy to use (${getAllStrategyNames().join(', ')})`,
    'balanced',
  )
  .option('--waves <n>', 'Number of waves to simulate', '10')
  .option('--difficulty <d>', 'Difficulty setting', 'normal')
  .option('--url <url>', 'Backend URL', 'http://localhost:3001')
  .option('--format <f>', 'Output format (console, json)', 'console')
  .option('--verbose', 'Show per-wave details')
  .action(
    async (opts: {
      strategy: string;
      waves: string;
      difficulty: string;
      url: string;
      format: string;
      verbose?: boolean;
    }) => {
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
      const isJson = opts.format === 'json';
      const client = new ApiClient(opts.url);

      // Health check
      console.log(chalk.gray(`Connecting to ${opts.url}...`));
      const healthy = await client.healthCheck();
      if (!healthy) {
        console.error(
          chalk.red(
            `Backend unreachable at ${opts.url}. Is the server running?`,
          ),
        );
        process.exit(1);
      }
      console.log(chalk.green('Backend is healthy.'));

      // Fetch data
      console.log(chalk.gray('Fetching game configuration...'));
      const [towers, enemies, settingsArr, waves] = await Promise.all([
        client.getTowers(),
        client.getEnemies(),
        client.getSettings(difficulty),
        client.getWaves(),
      ]);

      const settings = settingsArr[0];
      if (!settings) {
        console.error(
          chalk.red(`No settings found for difficulty "${difficulty}".`),
        );
        process.exit(1);
      }

      // Resolve strategy
      let strategy;
      try {
        strategy = getStrategy(opts.strategy);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(msg));
        process.exit(1);
      }

      console.log(
        chalk.gray(
          `Running simulation: strategy="${strategy.name}", waves=${numWaves}, difficulty="${difficulty}"`,
        ),
      );

      // Run simulation
      const engine = new SimulationEngine(
        towers,
        enemies,
        settings,
        waves,
        strategy,
        numWaves,
      );
      const result = engine.run();

      if (isJson) {
        const jsonReporter = new JsonReporter();
        jsonReporter.reportSimulation(result);
      } else {
        // Print per-wave details if verbose
        if (opts.verbose) {
          console.log('');
          console.log(chalk.bold('--- Per-Wave Results ---'));
          console.log(
            `  ${'Wave'.padStart(4)}  ${'Spawned'.padStart(7)}  ${'Killed'.padStart(6)}  ${'Escaped'.padStart(7)}  ${'Damage'.padStart(8)}  ${'Earned'.padStart(8)}  ${'Spent'.padStart(8)}  ${'Built'.padStart(5)}  ${'Upgr'.padStart(4)}`,
          );
          console.log(`  ${'-'.repeat(70)}`);

          for (const wm of result.perWaveMetrics) {
            console.log(
              `  ${String(wm.wave).padStart(4)}  ${String(wm.enemiesSpawned).padStart(7)}  ${String(wm.enemiesKilled).padStart(6)}  ${String(wm.enemiesEscaped).padStart(7)}  ${String(Math.round(wm.damageDealt)).padStart(8)}  ${String(wm.coinsEarned).padStart(8)}  ${String(wm.coinsSpent).padStart(8)}  ${String(wm.towersBuilt).padStart(5)}  ${String(wm.towersUpgraded).padStart(4)}`,
            );
          }
        }

        // Print summary
        console.log('');
        console.log(chalk.bold('='.repeat(50)));
        console.log(chalk.bold('  Simulation Summary'));
        console.log(chalk.bold('='.repeat(50)));
        console.log(`  Strategy:        ${result.strategy}`);
        console.log(`  Difficulty:      ${result.difficulty}`);
        console.log(
          `  Waves completed: ${result.wavesCompleted} / ${result.totalWaves}`,
        );
        console.log(`  Enemies killed:  ${result.enemiesKilled}`);
        console.log(`  Enemies escaped: ${result.enemiesEscaped}`);
        console.log(`  Lives remaining: ${result.livesRemaining}`);
        console.log(`  Final coins:     ${result.finalCoins}`);

        const won = result.livesRemaining > 0;
        console.log(
          `  Outcome:         ${won ? chalk.green('WIN') : chalk.red('LOSS')}`,
        );

        // Tower usage
        if (Object.keys(result.towerUsage).length > 0) {
          console.log('');
          console.log(chalk.bold('  Tower Usage:'));
          for (const [towerId, count] of Object.entries(result.towerUsage)) {
            const towerDef = towers.find((t) => t.id === Number(towerId));
            const name = towerDef?.name ?? `Tower ${towerId}`;
            console.log(`    ${name}: ${count} placed`);
          }
        }

        // Tower damage share
        if (Object.keys(result.towerDamageShare).length > 0) {
          console.log('');
          console.log(chalk.bold('  Tower Damage Share:'));
          for (const [towerId, share] of Object.entries(
            result.towerDamageShare,
          )) {
            const towerDef = towers.find((t) => t.id === Number(towerId));
            const name = towerDef?.name ?? `Tower ${towerId}`;
            console.log(`    ${name}: ${(share * 100).toFixed(1)}%`);
          }
        }

        // Enemy leak rate
        if (Object.keys(result.enemyLeakRate).length > 0) {
          console.log('');
          console.log(chalk.bold('  Enemy Leak Rate:'));
          for (const [enemyId, rate] of Object.entries(
            result.enemyLeakRate,
          )) {
            const enemyDef = enemies.find((e) => e.id === Number(enemyId));
            const name = enemyDef?.name ?? `Enemy ${enemyId}`;
            const rateStr = (rate * 100).toFixed(1) + '%';
            const colored =
              rate > 0.3 ? chalk.red(rateStr) : chalk.green(rateStr);
            console.log(`    ${name}: ${colored}`);
          }
        }

        console.log('');
        console.log(chalk.bold('Simulation complete.'));
      }
    },
  );

program
  .command('suggest')
  .description('Generate balance suggestions from analysis')
  .option('--url <url>', 'Backend URL', 'http://localhost:3001')
  .option('--difficulty <d>', 'Difficulty to analyze', 'normal')
  .option('--waves <n>', 'Number of waves to analyze', '10')
  .option('--sim-runs <n>', 'Number of simulation runs per strategy (Tier 3)', '3')
  .option('--apply', 'Apply suggestions via API')
  .option('--dry-run', 'Show API calls without executing')
  .option('--format <f>', 'Output format (console, json)', 'console')
  .action(
    async (opts: {
      url: string;
      difficulty: string;
      waves: string;
      simRuns: string;
      apply?: boolean;
      dryRun?: boolean;
      format: string;
    }) => {
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
      const simRuns = Number(opts.simRuns);
      const reporter = createReporter(opts.format);
      const client = new ApiClient(opts.url);

      // Health check
      console.log(chalk.gray(`Connecting to ${opts.url}...`));
      const healthy = await client.healthCheck();
      if (!healthy) {
        console.error(
          chalk.red(
            `Backend unreachable at ${opts.url}. Is the server running?`,
          ),
        );
        process.exit(1);
      }
      console.log(chalk.green('Backend is healthy.'));

      // Fetch data
      console.log(chalk.gray('Fetching game configuration...'));
      const [towers, enemies, settingsArr, waves] = await Promise.all([
        client.getTowers(),
        client.getEnemies(),
        client.getSettings(difficulty),
        client.getWaves(),
      ]);

      const settings = settingsArr[0];
      if (!settings) {
        console.error(
          chalk.red(`No settings found for difficulty "${difficulty}".`),
        );
        process.exit(1);
      }

      // Run Tier 1 analysis
      console.log(chalk.gray('\nRunning Tier 1 analysis...'));
      const tier1Results = analyzeTier1(towers, enemies, settings);
      reporter.reportTier1(tier1Results);

      // Run Tier 2 analysis
      console.log(chalk.gray('\nRunning Tier 2 analysis...'));
      const tier2Results = analyzeTier2(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
      );
      reporter.reportTier2(tier2Results);

      // Run Tier 3 analysis
      console.log(
        chalk.gray(
          `\nRunning Tier 3 analysis (${simRuns} runs per strategy)...`,
        ),
      );
      const tier3Results = await analyzeTier3(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        simRuns,
      );
      reporter.reportTier3(tier3Results);

      // Generate suggestions
      console.log(chalk.gray('\nGenerating suggestions...'));
      const suggestions = generateSuggestions(
        tier1Results,
        tier2Results,
        tier3Results,
        towers,
        enemies,
        settings,
      );
      reporter.reportSuggestions(suggestions);

      // Apply or dry-run
      if (opts.dryRun) {
        printDryRun(suggestions);
      } else if (opts.apply) {
        await applySuggestions(client, suggestions);
      }

      console.log('');
      console.log(chalk.bold('Suggest complete.'));
    },
  );

program
  .command('report')
  .description('Run analysis and output report')
  .option('--format <f>', 'Output format (console, json)', 'console')
  .option('--url <url>', 'Backend URL', 'http://localhost:3001')
  .option('--difficulty <d>', 'Difficulty', 'normal')
  .option('--waves <n>', 'Number of waves', '10')
  .option('--sim-runs <n>', 'Number of simulation runs per strategy (Tier 3)', '3')
  .action(
    async (opts: {
      format: string;
      url: string;
      difficulty: string;
      waves: string;
      simRuns: string;
    }) => {
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
      const simRuns = Number(opts.simRuns);
      const reporter = createReporter(opts.format);
      const client = new ApiClient(opts.url);

      // Health check
      console.log(chalk.gray(`Connecting to ${opts.url}...`));
      const healthy = await client.healthCheck();
      if (!healthy) {
        console.error(
          chalk.red(
            `Backend unreachable at ${opts.url}. Is the server running?`,
          ),
        );
        process.exit(1);
      }
      console.log(chalk.green('Backend is healthy.'));

      // Fetch data
      console.log(chalk.gray('Fetching game configuration...'));
      const [towers, enemies, settingsArr, waves] = await Promise.all([
        client.getTowers(),
        client.getEnemies(),
        client.getSettings(difficulty),
        client.getWaves(),
      ]);

      const settings = settingsArr[0];
      if (!settings) {
        console.error(
          chalk.red(`No settings found for difficulty "${difficulty}".`),
        );
        process.exit(1);
      }

      // Classification
      const classifiedTowers = classifyTowers(towers);
      const classifiedEnemies = classifyEnemies(enemies);
      reporter.reportClassification(classifiedTowers, classifiedEnemies);

      // Tier 1
      console.log(chalk.gray('\nRunning Tier 1 analysis...'));
      const tier1Results = analyzeTier1(towers, enemies, settings);
      reporter.reportTier1(tier1Results);

      // Tier 2
      console.log(chalk.gray('\nRunning Tier 2 analysis...'));
      const tier2Results = analyzeTier2(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
      );
      reporter.reportTier2(tier2Results);

      // Tier 3
      console.log(
        chalk.gray(
          `\nRunning Tier 3 analysis (${simRuns} runs per strategy)...`,
        ),
      );
      const tier3Results = await analyzeTier3(
        towers,
        enemies,
        settings,
        waves,
        numWaves,
        simRuns,
      );
      reporter.reportTier3(tier3Results);

      console.log('');
      console.log(chalk.bold('Report complete.'));
    },
  );

program
  .command('play')
  .description('Play games via API (creates real game sessions)')
  .option(
    '--strategy <name>',
    `Strategy to use (${getAllStrategyNames().join(', ')})`,
    'balanced',
  )
  .option('--difficulty <d>', 'Difficulty', 'normal')
  .option('--waves <n>', 'Number of waves', '10')
  .option('--game-mode <m>', 'Game mode (10waves, 20waves, endless)', '10waves')
  .option('--url <url>', 'Backend URL', 'http://localhost:3001')
  .option('-n <count>', 'Number of games to play', '1')
  .option('--compare', 'Play with all strategies and compare')
  .option('--all-strategies', 'Play N games with each strategy')
  .option('--verbose', 'Show per-wave details')
  .action(
    async (opts: {
      strategy: string;
      difficulty: string;
      waves: string;
      gameMode: string;
      url: string;
      n: string;
      compare?: boolean;
      allStrategies?: boolean;
      verbose?: boolean;
    }) => {
      const difficulty = opts.difficulty as SettingsMode;
      const gameMode = opts.gameMode as GameMode;
      const numWaves = Number(opts.waves);
      const numGames = Number(opts.n);
      const configClient = new ApiClient(opts.url);
      const gamePlayClient = new GamePlayClient(opts.url);

      // Health check
      console.log(chalk.gray(`Connecting to ${opts.url}...`));
      const healthy = await configClient.healthCheck();
      if (!healthy) {
        console.error(
          chalk.red(
            `Backend unreachable at ${opts.url}. Is the server running?`,
          ),
        );
        process.exit(1);
      }
      console.log(chalk.green('Backend is healthy.'));

      // Determine which strategies to run
      const strategyNames =
        opts.compare || opts.allStrategies
          ? getAllStrategyNames()
          : [opts.strategy];

      const allResults: BotRunResult[] = [];

      for (const stratName of strategyNames) {
        let strategy;
        try {
          strategy = getStrategy(stratName);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(chalk.red(msg));
          continue;
        }

        const gamesForStrategy = opts.compare ? 1 : numGames;

        console.log('');
        console.log(
          chalk.bold(
            `Playing ${gamesForStrategy} game(s) with strategy "${strategy.name}" (${difficulty}, ${gameMode}, ${numWaves} waves)`,
          ),
        );

        for (let g = 1; g <= gamesForStrategy; g++) {
          if (gamesForStrategy > 1) {
            console.log(chalk.gray(`\n--- Game ${g}/${gamesForStrategy} ---`));
          }

          const bot = new GameBot(
            gamePlayClient,
            configClient,
            strategy,
            difficulty,
            gameMode,
            numWaves,
            opts.verbose,
          );

          try {
            const result = await bot.play();
            allResults.push(result);
            printBotResult(result);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(chalk.red(`  Game failed: ${msg}`));
          }
        }
      }

      // Print comparison table if multiple results
      if (allResults.length > 1) {
        printComparisonTable(allResults);
      }

      console.log('');
      console.log(chalk.bold('Play complete.'));
    },
  );

program.parse();

function printBotResult(result: BotRunResult): void {
  const outcomeStr =
    result.outcome === 'win' ? chalk.green('WIN') : chalk.red('LOSS');

  console.log('');
  console.log(chalk.bold('  Game Result'));
  console.log(`  Game ID:         ${result.gameId}`);
  console.log(`  Strategy:        ${result.strategy}`);
  console.log(`  Difficulty:      ${result.difficulty}`);
  console.log(`  Game mode:       ${result.gameMode}`);
  console.log(
    `  Waves completed: ${result.wavesCompleted} / ${result.totalWaves}`,
  );
  console.log(`  Enemies killed:  ${result.enemiesKilled}`);
  console.log(`  Enemies escaped: ${result.enemiesEscaped}`);
  console.log(`  Lives remaining: ${result.livesRemaining}`);
  console.log(`  Final coins:     ${result.finalCoins}`);
  console.log(`  Outcome:         ${outcomeStr}`);
}

function printComparisonTable(results: BotRunResult[]): void {
  console.log('');
  console.log(chalk.bold('='.repeat(90)));
  console.log(chalk.bold('  Comparison Table'));
  console.log(chalk.bold('='.repeat(90)));

  const header = [
    'Strategy'.padEnd(16),
    'Outcome'.padEnd(8),
    'Waves'.padStart(7),
    'Killed'.padStart(8),
    'Escaped'.padStart(9),
    'Lives'.padStart(7),
    'Coins'.padStart(8),
  ].join('  ');
  console.log(`  ${header}`);
  console.log(`  ${'-'.repeat(86)}`);

  for (const r of results) {
    const outcomeRaw = r.outcome === 'win' ? 'WIN' : 'LOSS';
    const outcomeColored =
      r.outcome === 'win'
        ? chalk.green(outcomeRaw.padEnd(8))
        : chalk.red(outcomeRaw.padEnd(8));
    const row = [
      r.strategy.padEnd(16),
      outcomeColored,
      `${r.wavesCompleted}/${r.totalWaves}`.padStart(7),
      String(r.enemiesKilled).padStart(8),
      String(r.enemiesEscaped).padStart(9),
      String(r.livesRemaining).padStart(7),
      String(r.finalCoins).padStart(8),
    ].join('  ');
    console.log(`  ${row}`);
  }

  // Summary by strategy
  const strategyGroups = new Map<string, BotRunResult[]>();
  for (const r of results) {
    const existing = strategyGroups.get(r.strategy);
    if (existing) {
      existing.push(r);
    } else {
      strategyGroups.set(r.strategy, [r]);
    }
  }

  if (strategyGroups.size > 1 || results.length > strategyGroups.size) {
    console.log('');
    console.log(chalk.bold('  Win Rate by Strategy:'));
    for (const [name, group] of strategyGroups) {
      const wins = group.filter((r) => r.outcome === 'win').length;
      const total = group.length;
      const pct = ((wins / total) * 100).toFixed(0);
      console.log(`    ${name}: ${wins}/${total} (${pct}%)`);
    }
  }
}
