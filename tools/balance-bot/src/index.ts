import { Command } from 'commander';
import chalk from 'chalk';
import { ApiClient } from './api/client';
import { classifyTowers, classifyEnemies } from './analysis/Classifier';
import { analyzeTier1 } from './analysis/Tier1CostEfficiency';
import { analyzeTier2 } from './analysis/Tier2WaveScaling';
import { SimulationEngine } from './simulation/SimulationEngine';
import {
  getStrategy,
  getAllStrategyNames,
} from './simulation/strategies/index';
import { ConsoleReporter } from './output/ConsoleReporter';
import type { SettingsMode } from './types';

const program = new Command();
const reporter = new ConsoleReporter();

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
  .option('--verbose', 'Show detailed output')
  .action(
    async (opts: {
      tier: string;
      url: string;
      difficulty: string;
      waves: string;
      verbose?: boolean;
    }) => {
      const tier = opts.tier === 'all' ? null : Number(opts.tier);
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
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

      // Tier 3 (placeholder for future phases)
      if (tier === null || tier === 3) {
        console.log(
          chalk.gray('\nTier 3 analysis not yet implemented.'),
        );
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
  .option('--verbose', 'Show per-wave details')
  .action(
    async (opts: {
      strategy: string;
      waves: string;
      difficulty: string;
      url: string;
      verbose?: boolean;
    }) => {
      const difficulty = opts.difficulty as SettingsMode;
      const numWaves = Number(opts.waves);
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
        for (const [enemyId, rate] of Object.entries(result.enemyLeakRate)) {
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
    },
  );

program.parse();
