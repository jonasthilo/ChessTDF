import chalk from 'chalk';
import type { GamePlayClient } from '../api/GamePlayClient';
import type { ApiClient } from '../api/client';
import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  WaveDefinition,
  SettingsMode,
  GameMode,
  GameStateResponse,
  StartWaveResponse,
} from '../types';
import {
  getGridSize,
  getSpawnX,
  getDespawnX,
  getEnemyPathY,
  GAME_CONSTANTS,
} from '../types';
import type {
  SimState,
  SimTower,
  SimEnemy,
  SimProjectile,
  Strategy,
  StrategyAction,
} from '../simulation/SimulationTypes';
import type { BotRunResult } from './BotTypes';

const DELTA_MS = 1000 / GAME_CONSTANTS.FPS;
const MAX_WAVE_TIME_MS = 60_000;

interface WaveSimResult {
  killed: number;
  escaped: number;
  totalReward: number;
  livesLost: number;
}

export class GameBot {
  private readonly gridSize: number;
  private readonly spawnX: number;
  private readonly despawnX: number;
  private readonly enemyPathY: number;

  constructor(
    private readonly gamePlayClient: GamePlayClient,
    private readonly configClient: ApiClient,
    private readonly strategy: Strategy,
    private readonly difficulty: SettingsMode,
    private readonly gameMode: GameMode,
    private readonly numWaves: number,
    private readonly verbose: boolean = false,
  ) {
    this.gridSize = getGridSize();
    this.spawnX = getSpawnX();
    this.despawnX = getDespawnX();
    this.enemyPathY = getEnemyPathY();
  }

  async play(): Promise<BotRunResult> {
    // Step 1: Start game
    this.log(chalk.gray('Starting game...'));
    const startResp = await this.gamePlayClient.startGame(
      this.gameMode,
      this.difficulty,
    );
    const gameId = startResp.gameId;
    this.log(chalk.gray(`  Game started: ${gameId}`));

    // Step 2: Fetch config data
    this.log(chalk.gray('Fetching configuration...'));
    const [towerDefs, enemyDefs, settingsArr, waves] = await Promise.all([
      this.configClient.getTowers(),
      this.configClient.getEnemies(),
      this.configClient.getSettings(this.difficulty),
      this.configClient.getWaves(),
    ]);

    const settings = settingsArr[0];
    if (!settings) {
      throw new Error(
        `No settings found for difficulty "${this.difficulty}"`,
      );
    }

    const sortedWaves = [...waves].sort(
      (a, b) => a.waveNumber - b.waveNumber,
    );

    // Track cumulative stats
    let totalKilled = 0;
    let totalEscaped = 0;
    let wavesCompleted = 0;

    // Build initial sim state from API
    let simState = await this.buildSimState(gameId, settings, towerDefs);

    // Step 3: Wave loop
    for (let w = 1; w <= this.numWaves; w++) {
      simState.wave = w;

      // 3a: Strategy decides pre-wave actions
      const actions = this.strategy.decideActions(
        simState,
        towerDefs,
        settings,
      );

      // 3b: Execute actions via API (build/upgrade/sell)
      await this.executeActionsViaApi(
        gameId,
        simState,
        actions,
        towerDefs,
        settings,
      );

      // 3c: Sync state after tower changes
      simState = await this.buildSimState(gameId, settings, towerDefs);
      simState.wave = w;

      // 3d: Start wave via API
      this.log(chalk.gray(`  Wave ${w}: starting...`));
      let waveResp: StartWaveResponse;
      try {
        waveResp = await this.gamePlayClient.startWave(gameId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.log(chalk.yellow(`  Wave ${w}: failed to start - ${msg}`));
        break;
      }

      // 3e: Simulate wave locally
      const waveDef = this.getWaveDefinition(sortedWaves, waveResp.wave);
      if (!waveDef) {
        this.log(chalk.yellow(`  Wave ${w}: no wave definition found`));
        break;
      }

      const waveResult = this.simulateWave(
        simState,
        waveDef,
        enemyDefs,
        settings,
        waveResp.wave,
      );

      totalKilled += waveResult.killed;
      totalEscaped += waveResult.escaped;

      // 3f: Report results to backend
      if (waveResult.totalReward > 0) {
        await this.gamePlayClient.addCoins(gameId, waveResult.totalReward);
      }

      let gameOver = false;
      for (let i = 0; i < waveResult.livesLost; i++) {
        const lifeResp = await this.gamePlayClient.loseLife(gameId);
        if (lifeResp.gameOver) {
          gameOver = true;
          break;
        }
      }

      this.log(
        chalk.gray(
          `  Wave ${w}: killed=${waveResult.killed}, escaped=${waveResult.escaped}, reward=${waveResult.totalReward}`,
        ),
      );

      wavesCompleted = w;

      // 3g: Sync state and check game over
      const gameState = await this.gamePlayClient.getGameState(gameId);
      if (gameOver || gameState.isOver || gameState.lives <= 0) {
        this.log(chalk.red(`  Game over after wave ${w}`));
        break;
      }

      // Rebuild sim state from fresh API state
      simState = this.gameStateToSimState(gameState, settings, towerDefs);
    }

    // Step 4: End game
    const finalState = await this.gamePlayClient.getGameState(gameId);
    const outcome =
      finalState.lives > 0 && wavesCompleted >= this.numWaves
        ? 'win'
        : 'lose';

    await this.gamePlayClient.endGame(gameId, {
      finalWave: wavesCompleted,
      enemiesKilled: totalKilled,
      outcome,
    });

    this.log(
      outcome === 'win'
        ? chalk.green(`  Result: WIN (${wavesCompleted} waves)`)
        : chalk.red(
            `  Result: LOSS (survived ${wavesCompleted}/${this.numWaves} waves)`,
          ),
    );

    return {
      gameId,
      strategy: this.strategy.name,
      difficulty: this.difficulty,
      gameMode: this.gameMode,
      wavesCompleted,
      totalWaves: this.numWaves,
      enemiesKilled: totalKilled,
      enemiesEscaped: totalEscaped,
      livesRemaining: Math.max(finalState.lives, 0),
      finalCoins: finalState.coins,
      outcome,
    };
  }

  /**
   * Fetch game state from the API and build a SimState for the strategy.
   */
  private async buildSimState(
    gameId: string,
    settings: GameSettings,
    towerDefs: TowerDefinition[],
  ): Promise<SimState> {
    const gameState = await this.gamePlayClient.getGameState(gameId);
    return this.gameStateToSimState(gameState, settings, towerDefs);
  }

  /**
   * Convert a GameStateResponse into a SimState.
   * Looks up tower stats from tower definitions based on towerId + level.
   */
  private gameStateToSimState(
    gameState: GameStateResponse,
    settings: GameSettings,
    towerDefs: TowerDefinition[],
  ): SimState {
    const towers: SimTower[] = gameState.towers.map((t, idx) => {
      const x = t.gridX * this.gridSize + this.gridSize / 2;
      const y = t.gridY * this.gridSize + this.gridSize / 2;

      // Look up stats from tower definitions
      const def = towerDefs.find((d) => d.id === t.towerId);
      const levelDef = def?.levels.find((l) => l.level === t.level);

      return {
        id: idx + 1,
        towerId: t.towerId,
        gridX: t.gridX,
        gridY: t.gridY,
        x,
        y,
        level: t.level,
        damage: levelDef?.damage ?? 0,
        range: levelDef?.range ?? 0,
        fireRate: levelDef?.fireRate ?? 0,
        lastFireTime: -Infinity,
        totalDamageDealt: 0,
        totalInvested: this.computeTotalInvested(def, t.level, settings),
      };
    });

    // Count tower usage
    const towerUsage: Record<number, number> = {};
    for (const t of towers) {
      towerUsage[t.towerId] = (towerUsage[t.towerId] ?? 0) + 1;
    }

    return {
      towers,
      enemies: [],
      projectiles: [],
      coins: gameState.coins,
      lives: gameState.lives,
      wave: gameState.wave,
      time: 0,
      nextTowerId: towers.length + 1,
      nextEnemyId: 1,
      nextProjectileId: 1,
      towerUsage,
      towerDamage: {},
      enemyKills: {},
      enemyEscapes: {},
    };
  }

  /**
   * Compute the total investment for a tower at a given level
   * (sum of costs for levels 1 through current level, scaled by cost multiplier).
   */
  private computeTotalInvested(
    towerDef: TowerDefinition | undefined,
    currentLevel: number,
    settings: GameSettings,
  ): number {
    if (!towerDef) return 0;
    let total = 0;
    for (const level of towerDef.levels) {
      if (level.level <= currentLevel) {
        total += Math.round(level.cost * settings.towerCostMultiplier);
      }
    }
    return total;
  }

  /**
   * Execute strategy actions via API calls.
   * Maps SimTower instance IDs back to API tower IDs using grid position.
   */
  private async executeActionsViaApi(
    gameId: string,
    simState: SimState,
    actions: StrategyAction[],
    towerDefs: TowerDefinition[],
    settings: GameSettings,
  ): Promise<void> {
    // Fetch current API state to get string tower IDs
    const gameState = await this.gamePlayClient.getGameState(gameId);
    const apiTowerMap = new Map<
      string,
      { apiId: string; gridX: number; gridY: number }
    >();
    for (const t of gameState.towers) {
      const key = `${t.gridX},${t.gridY}`;
      apiTowerMap.set(key, {
        apiId: t.id,
        gridX: t.gridX,
        gridY: t.gridY,
      });
    }

    let currentCoins = gameState.coins;

    for (const action of actions) {
      switch (action.type) {
        case 'build': {
          if (
            action.towerId == null ||
            action.gridX == null ||
            action.gridY == null
          ) {
            break;
          }

          const towerDef = towerDefs.find((t) => t.id === action.towerId);
          if (!towerDef) break;
          const level1 = towerDef.levels.find((l) => l.level === 1);
          if (!level1) break;
          const cost = Math.round(
            level1.cost * settings.towerCostMultiplier,
          );
          if (currentCoins < cost) break;

          try {
            const resp = await this.gamePlayClient.buildTower(gameId, {
              towerId: action.towerId,
              gridX: action.gridX,
              gridY: action.gridY,
            });
            currentCoins = resp.coins;
            const key = `${action.gridX},${action.gridY}`;
            apiTowerMap.set(key, {
              apiId: resp.tower.id,
              gridX: action.gridX,
              gridY: action.gridY,
            });
            this.log(
              chalk.gray(
                `    Built ${towerDef.name} at (${action.gridX}, ${action.gridY})`,
              ),
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(chalk.yellow(`    Build failed: ${msg}`));
          }
          break;
        }

        case 'upgrade': {
          if (action.targetTowerInstanceId == null) break;

          const simTower = simState.towers.find(
            (t) => t.id === action.targetTowerInstanceId,
          );
          if (!simTower) break;

          const key = `${simTower.gridX},${simTower.gridY}`;
          const apiTower = apiTowerMap.get(key);
          if (!apiTower) break;

          try {
            const resp = await this.gamePlayClient.upgradeTower(
              gameId,
              apiTower.apiId,
            );
            currentCoins = resp.coins;
            this.log(
              chalk.gray(
                `    Upgraded tower at (${simTower.gridX}, ${simTower.gridY}) to level ${resp.tower.level}`,
              ),
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(chalk.yellow(`    Upgrade failed: ${msg}`));
          }
          break;
        }

        case 'sell': {
          if (action.targetTowerInstanceId == null) break;

          const simTower = simState.towers.find(
            (t) => t.id === action.targetTowerInstanceId,
          );
          if (!simTower) break;

          const key = `${simTower.gridX},${simTower.gridY}`;
          const apiTower = apiTowerMap.get(key);
          if (!apiTower) break;

          try {
            const resp = await this.gamePlayClient.sellTower(
              gameId,
              apiTower.apiId,
            );
            currentCoins = resp.coins;
            apiTowerMap.delete(key);
            this.log(
              chalk.gray(
                `    Sold tower at (${simTower.gridX}, ${simTower.gridY}) for ${resp.refund}`,
              ),
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.log(chalk.yellow(`    Sell failed: ${msg}`));
          }
          break;
        }

        case 'none':
          break;
      }
    }
  }

  /**
   * Simulate a single wave locally to determine kills, escapes, and rewards.
   * Uses the same tick-based simulation logic as SimulationEngine.
   */
  private simulateWave(
    simState: SimState,
    waveDef: WaveDefinition,
    enemyDefs: EnemyDefinition[],
    settings: GameSettings,
    waveNumber: number,
  ): WaveSimResult {
    // Build spawn queue
    const spawnQueue: Array<{ enemyId: number; spawnTime: number }> = [];
    let cumulativeTime = 0;
    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        spawnQueue.push({
          enemyId: group.enemyId,
          spawnTime: cumulativeTime,
        });
        cumulativeTime += group.spawnDelayMs;
      }
    }

    // Clone towers with reset fire timers for this wave
    const simTowers: SimTower[] = simState.towers.map((t) => ({
      ...t,
      lastFireTime: -Infinity,
      totalDamageDealt: 0,
    }));

    const enemies: SimEnemy[] = [];
    const projectiles: SimProjectile[] = [];
    let nextEnemyId = 1;
    let nextProjectileId = 1;

    let killed = 0;
    let escaped = 0;
    let totalReward = 0;

    let spawnIndex = 0;
    let time = 0;

    while (time < MAX_WAVE_TIME_MS) {
      // Spawn enemies
      while (
        spawnIndex < spawnQueue.length &&
        spawnQueue[spawnIndex]!.spawnTime <= time
      ) {
        const entry = spawnQueue[spawnIndex]!;
        const enemyDef = enemyDefs.find((e) => e.id === entry.enemyId);
        if (enemyDef) {
          const scaledHealth = this.scaleHealth(
            enemyDef.health,
            settings,
            waveNumber,
          );
          const scaledSpeed =
            enemyDef.speed * settings.enemySpeedMultiplier;
          const scaledReward = this.scaleReward(
            enemyDef.reward,
            settings,
            waveNumber,
          );

          enemies.push({
            id: nextEnemyId++,
            enemyId: enemyDef.id,
            x: this.spawnX,
            y: this.enemyPathY,
            health: scaledHealth,
            maxHealth: scaledHealth,
            speed: scaledSpeed,
            reward: scaledReward,
            isDead: false,
            hasEscaped: false,
          });
        }
        spawnIndex++;
      }

      // Move enemies
      for (const enemy of enemies) {
        if (enemy.isDead || enemy.hasEscaped) continue;
        enemy.x += (enemy.speed * DELTA_MS) / 1000;

        if (enemy.x >= this.despawnX) {
          enemy.hasEscaped = true;
          escaped++;
        }
      }

      // Tower targeting and firing
      for (const tower of simTowers) {
        if (tower.fireRate <= 0) continue;
        const cooldownMs = 1000 / tower.fireRate;
        if (time - tower.lastFireTime < cooldownMs) continue;

        let nearestEnemy: SimEnemy | null = null;
        let nearestDist = Infinity;

        for (const enemy of enemies) {
          if (enemy.isDead || enemy.hasEscaped) continue;
          const dist = calcDistance(tower.x, tower.y, enemy.x, enemy.y);
          if (dist <= tower.range && dist < nearestDist) {
            nearestDist = dist;
            nearestEnemy = enemy;
          }
        }

        if (nearestEnemy) {
          tower.lastFireTime = time;
          projectiles.push({
            id: nextProjectileId++,
            x: tower.x,
            y: tower.y,
            targetId: nearestEnemy.id,
            damage: tower.damage,
            speed: GAME_CONSTANTS.PROJECTILE_SPEED,
          });
        }
      }

      // Move projectiles
      const activeProjectiles: SimProjectile[] = [];
      for (const proj of projectiles) {
        const target = enemies.find((e) => e.id === proj.targetId);
        if (!target || target.isDead || target.hasEscaped) continue;

        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONSTANTS.HIT_THRESHOLD) {
          target.health -= proj.damage;
          if (target.health <= 0) {
            target.isDead = true;
            killed++;
            totalReward += target.reward;
          }
          continue;
        }

        const moveAmount = (proj.speed * DELTA_MS) / 1000;
        if (dist > 0) {
          proj.x += (dx / dist) * moveAmount;
          proj.y += (dy / dist) * moveAmount;
        }
        activeProjectiles.push(proj);
      }
      projectiles.length = 0;
      projectiles.push(...activeProjectiles);

      time += DELTA_MS;

      // Check if wave is complete
      const allSpawned = spawnIndex >= spawnQueue.length;
      const allResolved = enemies.every(
        (e) => e.isDead || e.hasEscaped,
      );
      if (allSpawned && allResolved) break;
    }

    return {
      killed,
      escaped,
      totalReward,
      livesLost: escaped,
    };
  }

  private scaleHealth(
    baseHealth: number,
    settings: GameSettings,
    wave: number,
  ): number {
    return Math.round(
      baseHealth *
        settings.enemyHealthMultiplier *
        (1 + wave * settings.enemyHealthWaveMultiplier),
    );
  }

  private scaleReward(
    baseReward: number,
    settings: GameSettings,
    wave: number,
  ): number {
    return Math.round(
      baseReward *
        settings.enemyRewardMultiplier *
        (1 + wave * settings.enemyRewardWaveMultiplier),
    );
  }

  private getWaveDefinition(
    waves: WaveDefinition[],
    waveNum: number,
  ): WaveDefinition | undefined {
    const exact = waves.find((w) => w.waveNumber === waveNum);
    if (exact) return exact;

    if (waves.length === 0) return undefined;
    return waves[waves.length - 1];
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

function calcDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
