# Balance Bot

Automated game-balance analysis and testing CLI for Chess Tower Defense. Combines static analysis, economy modeling, tick-based simulation, and an API game-playing bot to detect balance issues and generate actionable fixes.

## Prerequisites

- Node.js 24+
- Backend running at `http://localhost:3001` (default)
- Install dependencies: `npm install` from `tools/balance-bot/`

## CLI Commands

All commands run via `npm run <command>` or `tsx src/index.ts <command>`.

### analyze

Run balance analysis across all three tiers.

```
npm run analyze [-- <options>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--tier <n>` | `all` | Run tier `1`, `2`, `3`, or `all` |
| `--url <url>` | `http://localhost:3001` | Backend URL |
| `--difficulty <d>` | `normal` | Difficulty to analyze |
| `--waves <n>` | `10` | Number of waves |
| `--sim-runs <n>` | `3` | Simulation runs per strategy (Tier 3) |
| `--format <f>` | `console` | Output format: `console` or `json` |
| `--verbose` | off | Show detailed per-wave output |

### simulate

Run a single game simulation with a chosen strategy.

```
npm run simulate [-- <options>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--strategy <name>` | `balanced` | Placement strategy (see below) |
| `--waves <n>` | `10` | Waves to simulate |
| `--difficulty <d>` | `normal` | Difficulty setting |
| `--url <url>` | `http://localhost:3001` | Backend URL |
| `--format <f>` | `console` | Output format |
| `--verbose` | off | Per-wave metrics table |

### suggest

Generate balance suggestions and optionally apply them via API.

```
npm run suggest [-- <options>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--url <url>` | `http://localhost:3001` | Backend URL |
| `--difficulty <d>` | `normal` | Difficulty to analyze |
| `--waves <n>` | `10` | Waves to analyze |
| `--sim-runs <n>` | `3` | Simulation runs for Tier 3 |
| `--dry-run` | off | Preview API calls without executing |
| `--apply` | off | Execute all suggestions via API |
| `--format <f>` | `console` | Output format |

### play

Play real game sessions against the backend API.

```
npm run play [-- <options>]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--strategy <name>` | `balanced` | Tower strategy |
| `--difficulty <d>` | `normal` | Difficulty |
| `--waves <n>` | `10` | Expected waves |
| `--game-mode <m>` | `10waves` | `10waves`, `20waves`, or `endless` |
| `--url <url>` | `http://localhost:3001` | Backend URL |
| `-n <count>` | `1` | Games to play |
| `--compare` | off | One game per strategy, compare results |
| `--all-strategies` | off | N games per strategy |
| `--verbose` | off | Per-wave details |

### report

Alias for `analyze --tier all`. Runs classification + all tiers.

```
npm run report [-- <options>]
```

## Analysis Tiers

### Tier 1: Cost Efficiency

Static analysis of tower and enemy stats without simulation.

- DPS and DPS-per-coin at each tower level
- Tower-vs-enemy matchups at waves 1, 5, and 10
- Time-to-kill, shots-to-kill, overkill ratio, range coverage

**Issues detected:** DPS/coin spread > 2x (one tower dominates on value), overkill > 3x, unkillable enemies (no tower can kill before exit), tower dominance (best DPS/coin at every level).

### Tier 2: Wave Scaling

Economy analysis of wave-by-wave affordability.

- Total scaled HP per wave vs. cumulative coin income
- Greedy tower-buying to estimate affordable DPS
- Surplus ratio: affordable DPS / required DPS

**Issues detected:** impossible waves (surplus < 1.0), difficulty spikes (surplus drops > 50%), trivial waves (surplus > 5.0), economy stalls.

### Tier 3: Iterative HITB

Tick-based simulation with sensitivity analysis.

- **Baseline:** runs all 5 strategies multiple times, aggregates win rate, tower pick rate, damage share, enemy leak rate
- **Sensitivity:** perturbs each tower stat (damage, fireRate, range) and enemy stat (health, speed) by +/-10%, measures impact on waves completed

**Issues detected:** tower dominance (pick rate > 60%), tower underuse (< 10%), enemy leak (> 50%), high strategy variance (> 40%).

## Strategies

| Name | Build/Upgrade Split | Approach |
|------|---------------------|----------|
| `balanced` | 60% build / 40% upgrade | Even tower mix, balance quantity and quality |
| `path-adjacent` | 70% build / 30% upgrade | Coverage-aggressive, flood the path |
| `random` | 100% build | Random tower types, no upgrades, baseline |
| `sniper-heavy` | 50% build / 50% upgrade | Prioritizes highest-range tower |
| `rapid-fire` | 50% build / 50% upgrade | Prioritizes highest fire-rate tower |

All strategies use smart grid placement: rows closest to the enemy path first (rows 3, 6, 2, 7, ...), center columns first, avoiding restricted rows 4-5.

## Suggestion Engine

Takes issues from all three tiers and generates concrete balance patches:

- **Tier 1:** adjust tower costs toward mean DPS/coin, increase enemy health for overkill, reduce speed or increase range for unkillable enemies
- **Tier 2:** reduce health scaling or increase reward scaling for impossible waves
- **Tier 3:** adjust costs for over/under-picked towers, reduce speed for high-leak enemies

All suggestions are constraint-validated (DB min/max bounds), capped at +/-30% change, and deduplicated. Each includes the API call to apply it and rollback SQL.

## Examples

```bash
# Quick analysis on normal difficulty
npm run analyze

# Tier 1 only, verbose
npm run analyze -- --tier 1 --verbose

# Compare all strategies in real API games
npm run play -- --compare

# Preview suggested balance changes
npm run suggest -- --dry-run

# Apply suggestions to the backend
npm run suggest -- --apply

# 5 games with sniper-heavy strategy
npm run play -- --strategy sniper-heavy -n 5

# JSON output for scripting
npm run analyze -- --format json > results.json
```

## Project Structure

```
src/
  index.ts                 CLI entry point (Commander.js)
  types.ts                 Shared types and game constants
  analysis/
    Classifier.ts          Tower/enemy role classification
    MetricsCollector.ts    Tier 3 metric aggregation
    Tier1CostEfficiency.ts Static cost-efficiency analysis
    Tier2WaveScaling.ts    Wave economy analysis
    Tier3IterativeHITB.ts  Simulation + sensitivity analysis
  simulation/
    SimulationEngine.ts    Tick-based game simulation (60 FPS)
    SimulationTypes.ts     Simulation state types
    strategies/
      index.ts             Strategy registry
      PlacementUtils.ts    Shared grid placement and upgrade logic
      BalancedStrategy.ts
      PathAdjacentStrategy.ts
      RandomStrategy.ts
      SniperHeavyStrategy.ts
      RapidFireStrategy.ts
  suggestions/
    SuggestionEngine.ts    Generates balance adjustments
    ConstraintValidator.ts DB field min/max bounds
    PatchGenerator.ts      API PATCH calls + rollback SQL
  bot/
    GameBot.ts             Plays real games via API
    BotTypes.ts            Bot state and result types
  api/
    client.ts              Config REST client
    GamePlayClient.ts      Gameplay REST client
  output/
    ConsoleReporter.ts     Colored terminal output
    JsonReporter.ts        JSON output
```
