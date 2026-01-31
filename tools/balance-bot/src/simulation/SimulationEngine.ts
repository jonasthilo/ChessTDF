import type {
  TowerDefinition,
  EnemyDefinition,
  GameSettings,
  WaveDefinition,
  SimulationRunResult,
  WaveSimMetrics,
} from '../types';
import {
  GAME_CONSTANTS,
  getGridSize,
  getSpawnX,
  getDespawnX,
  getEnemyPathY,
} from '../types';
import type {
  SimState,
  SimTower,
  SimEnemy,
  SimProjectile,
  SpawnEntry,
  Strategy,
  StrategyAction,
} from './SimulationTypes';

const DELTA_MS = 1000 / GAME_CONSTANTS.FPS; // ~16.667ms per tick
const MAX_WAVE_TIME_MS = 60_000; // 60 second timeout per wave

export class SimulationEngine {
  private readonly towers: TowerDefinition[];
  private readonly enemies: EnemyDefinition[];
  private readonly settings: GameSettings;
  private readonly waves: WaveDefinition[];
  private readonly strategy: Strategy;
  private readonly numWaves: number;
  private readonly gridSize: number;
  private readonly spawnX: number;
  private readonly despawnX: number;
  private readonly enemyPathY: number;

  constructor(
    towers: TowerDefinition[],
    enemies: EnemyDefinition[],
    settings: GameSettings,
    waves: WaveDefinition[],
    strategy: Strategy,
    numWaves: number,
  ) {
    this.towers = towers;
    this.enemies = enemies;
    this.settings = settings;
    this.waves = waves.sort((a, b) => a.waveNumber - b.waveNumber);
    this.strategy = strategy;
    this.numWaves = numWaves;
    this.gridSize = getGridSize();
    this.spawnX = getSpawnX();
    this.despawnX = getDespawnX();
    this.enemyPathY = getEnemyPathY();
  }

  run(): SimulationRunResult {
    const state = this.initState();
    const perWaveMetrics: WaveSimMetrics[] = [];
    let totalEnemiesKilled = 0;
    let totalEnemiesEscaped = 0;
    let wavesCompleted = 0;

    for (let w = 1; w <= this.numWaves; w++) {
      state.wave = w;
      state.time = 0;

      // Get wave composition (reuse max defined wave if beyond max)
      const waveDef = this.getWaveDefinition(w);
      if (!waveDef) continue;

      // Strategy decides pre-wave actions
      const actions = this.strategy.decideActions(
        state,
        this.towers,
        this.settings,
      );
      const waveCoinsSpent = this.executeActions(state, actions);
      const towersBuilt = actions.filter((a) => a.type === 'build').length;
      const towersUpgraded = actions.filter(
        (a) => a.type === 'upgrade',
      ).length;

      // Build spawn queue
      const spawnQueue = this.buildSpawnQueue(waveDef);

      // Reset per-wave enemy tracking
      const waveEnemiesSpawned = spawnQueue.length;
      let waveEnemiesKilled = 0;
      let waveEnemiesEscaped = 0;
      let waveDamageDealt = 0;
      let waveCoinsEarned = 0;

      // Clear enemies and projectiles for the new wave
      state.enemies = [];
      state.projectiles = [];

      let spawnIndex = 0;

      // Tick loop
      while (state.time < MAX_WAVE_TIME_MS) {
        // Spawn enemies whose time has come
        while (
          spawnIndex < spawnQueue.length &&
          spawnQueue[spawnIndex]!.spawnTime <= state.time
        ) {
          const entry = spawnQueue[spawnIndex]!;
          const enemyDef = this.enemies.find((e) => e.id === entry.enemyId);
          if (enemyDef) {
            const scaledHealth = this.scaleHealth(
              enemyDef.health,
              state.wave,
            );
            const scaledSpeed =
              enemyDef.speed * this.settings.enemySpeedMultiplier;
            const scaledReward = this.scaleReward(
              enemyDef.reward,
              state.wave,
            );

            const enemy: SimEnemy = {
              id: state.nextEnemyId++,
              enemyId: enemyDef.id,
              x: this.spawnX,
              y: this.enemyPathY,
              health: scaledHealth,
              maxHealth: scaledHealth,
              speed: scaledSpeed,
              reward: scaledReward,
              isDead: false,
              hasEscaped: false,
            };
            state.enemies.push(enemy);
          }
          spawnIndex++;
        }

        // Move enemies
        for (const enemy of state.enemies) {
          if (enemy.isDead || enemy.hasEscaped) continue;
          enemy.x += (enemy.speed * DELTA_MS) / 1000;

          // Check escape
          if (enemy.x >= this.despawnX) {
            enemy.hasEscaped = true;
            state.lives--;
            waveEnemiesEscaped++;
            state.enemyEscapes[enemy.enemyId] =
              (state.enemyEscapes[enemy.enemyId] ?? 0) + 1;
          }
        }

        // Tower targeting and firing
        for (const tower of state.towers) {
          const cooldownMs = 1000 / tower.fireRate;
          if (state.time - tower.lastFireTime < cooldownMs) continue;

          // Find nearest alive enemy in range
          let nearestEnemy: SimEnemy | null = null;
          let nearestDist = Infinity;

          for (const enemy of state.enemies) {
            if (enemy.isDead || enemy.hasEscaped) continue;
            const dist = distance(tower.x, tower.y, enemy.x, enemy.y);
            if (dist <= tower.range && dist < nearestDist) {
              nearestDist = dist;
              nearestEnemy = enemy;
            }
          }

          if (nearestEnemy) {
            tower.lastFireTime = state.time;
            const projectile: SimProjectile = {
              id: state.nextProjectileId++,
              x: tower.x,
              y: tower.y,
              targetId: nearestEnemy.id,
              damage: tower.damage,
              speed: GAME_CONSTANTS.PROJECTILE_SPEED,
            };
            state.projectiles.push(projectile);
          }
        }

        // Move projectiles toward target
        const activeProjectiles: SimProjectile[] = [];
        for (const proj of state.projectiles) {
          const target = state.enemies.find((e) => e.id === proj.targetId);

          // If target is dead or escaped, remove projectile
          if (!target || target.isDead || target.hasEscaped) continue;

          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Collision check
          if (dist < GAME_CONSTANTS.HIT_THRESHOLD) {
            target.health -= proj.damage;
            waveDamageDealt += proj.damage;

            // Find the tower that shot this (by damage match on the active towers)
            // Track damage on towers
            for (const tower of state.towers) {
              if (tower.damage === proj.damage) {
                tower.totalDamageDealt += proj.damage;
                state.towerDamage[tower.towerId] =
                  (state.towerDamage[tower.towerId] ?? 0) + proj.damage;
                break;
              }
            }

            if (target.health <= 0) {
              target.isDead = true;
              state.coins += target.reward;
              waveCoinsEarned += target.reward;
              waveEnemiesKilled++;
              state.enemyKills[target.enemyId] =
                (state.enemyKills[target.enemyId] ?? 0) + 1;
            }
            // Projectile is consumed; do not keep
            continue;
          }

          // Move toward target
          const moveAmount = (proj.speed * DELTA_MS) / 1000;
          if (dist > 0) {
            proj.x += (dx / dist) * moveAmount;
            proj.y += (dy / dist) * moveAmount;
          }
          activeProjectiles.push(proj);
        }
        state.projectiles = activeProjectiles;

        state.time += DELTA_MS;

        // Check if wave is done: all spawned, all dead or escaped
        const allSpawned = spawnIndex >= spawnQueue.length;
        const allResolved = state.enemies.every(
          (e) => e.isDead || e.hasEscaped,
        );
        if (allSpawned && allResolved) break;

        // Check game over
        if (state.lives <= 0) break;
      }

      totalEnemiesKilled += waveEnemiesKilled;
      totalEnemiesEscaped += waveEnemiesEscaped;

      perWaveMetrics.push({
        wave: w,
        enemiesSpawned: waveEnemiesSpawned,
        enemiesKilled: waveEnemiesKilled,
        enemiesEscaped: waveEnemiesEscaped,
        damageDealt: waveDamageDealt,
        coinsEarned: waveCoinsEarned,
        coinsSpent: waveCoinsSpent,
        towersBuilt,
        towersUpgraded,
      });

      wavesCompleted = w;

      if (state.lives <= 0) break;
    }

    // Compute damage share percentages
    const totalDamage = Object.values(state.towerDamage).reduce(
      (sum, d) => sum + d,
      0,
    );
    const towerDamageShare: Record<number, number> = {};
    for (const [towerId, dmg] of Object.entries(state.towerDamage)) {
      towerDamageShare[Number(towerId)] =
        totalDamage > 0 ? dmg / totalDamage : 0;
    }

    // Compute enemy leak rate
    const enemyLeakRate: Record<number, number> = {};
    const allEnemyIds = new Set([
      ...Object.keys(state.enemyKills).map(Number),
      ...Object.keys(state.enemyEscapes).map(Number),
    ]);
    for (const eid of allEnemyIds) {
      const kills = state.enemyKills[eid] ?? 0;
      const escapes = state.enemyEscapes[eid] ?? 0;
      const total = kills + escapes;
      enemyLeakRate[eid] = total > 0 ? escapes / total : 0;
    }

    return {
      strategy: this.strategy.name,
      difficulty: this.settings.mode,
      wavesCompleted,
      totalWaves: this.numWaves,
      enemiesKilled: totalEnemiesKilled,
      enemiesEscaped: totalEnemiesEscaped,
      livesRemaining: Math.max(state.lives, 0),
      finalCoins: state.coins,
      towerUsage: { ...state.towerUsage },
      towerDamageShare,
      enemyLeakRate,
      perWaveMetrics,
    };
  }

  private initState(): SimState {
    return {
      towers: [],
      enemies: [],
      projectiles: [],
      coins: this.settings.initialCoins,
      lives: this.settings.initialLives,
      wave: 0,
      time: 0,
      nextTowerId: 1,
      nextEnemyId: 1,
      nextProjectileId: 1,
      towerUsage: {},
      towerDamage: {},
      enemyKills: {},
      enemyEscapes: {},
    };
  }

  private getWaveDefinition(waveNum: number): WaveDefinition | undefined {
    // Find exact wave, or reuse the highest defined wave
    const exact = this.waves.find((w) => w.waveNumber === waveNum);
    if (exact) return exact;

    // Reuse the highest-numbered wave definition
    if (this.waves.length === 0) return undefined;
    return this.waves[this.waves.length - 1];
  }

  private buildSpawnQueue(waveDef: WaveDefinition): SpawnEntry[] {
    const queue: SpawnEntry[] = [];
    let cumulativeTime = 0;

    for (const group of waveDef.enemies) {
      for (let i = 0; i < group.count; i++) {
        queue.push({
          enemyId: group.enemyId,
          spawnTime: cumulativeTime,
        });
        cumulativeTime += group.spawnDelayMs;
      }
    }

    return queue;
  }

  private scaleHealth(baseHealth: number, wave: number): number {
    return Math.round(
      baseHealth *
        this.settings.enemyHealthMultiplier *
        (1 + wave * this.settings.enemyHealthWaveMultiplier),
    );
  }

  private scaleReward(baseReward: number, wave: number): number {
    return Math.round(
      baseReward *
        this.settings.enemyRewardMultiplier *
        (1 + wave * this.settings.enemyRewardWaveMultiplier),
    );
  }

  private executeActions(state: SimState, actions: StrategyAction[]): number {
    let totalSpent = 0;

    for (const action of actions) {
      switch (action.type) {
        case 'build': {
          if (
            action.towerId == null ||
            action.gridX == null ||
            action.gridY == null
          )
            break;

          const towerDef = this.towers.find((t) => t.id === action.towerId);
          if (!towerDef) break;

          const level1 = towerDef.levels.find((l) => l.level === 1);
          if (!level1) break;

          const cost = Math.round(
            level1.cost * this.settings.towerCostMultiplier,
          );
          if (state.coins < cost) break;

          // Validate placement
          if (!this.isValidPlacement(state, action.gridX, action.gridY)) break;

          state.coins -= cost;
          totalSpent += cost;

          const tower: SimTower = {
            id: state.nextTowerId++,
            towerId: towerDef.id,
            gridX: action.gridX,
            gridY: action.gridY,
            x: action.gridX * this.gridSize + this.gridSize / 2,
            y: action.gridY * this.gridSize + this.gridSize / 2,
            level: 1,
            damage: level1.damage,
            range: level1.range,
            fireRate: level1.fireRate,
            lastFireTime: -Infinity,
            totalDamageDealt: 0,
            totalInvested: cost,
          };
          state.towers.push(tower);
          state.towerUsage[towerDef.id] =
            (state.towerUsage[towerDef.id] ?? 0) + 1;
          break;
        }

        case 'upgrade': {
          if (action.targetTowerInstanceId == null) break;

          const tower = state.towers.find(
            (t) => t.id === action.targetTowerInstanceId,
          );
          if (!tower) break;

          const towerDef = this.towers.find((t) => t.id === tower.towerId);
          if (!towerDef) break;

          const nextLevel = tower.level + 1;
          const nextLevelDef = towerDef.levels.find(
            (l) => l.level === nextLevel,
          );
          if (!nextLevelDef) break; // already at max level

          const cost = Math.round(
            nextLevelDef.cost * this.settings.towerCostMultiplier,
          );
          if (state.coins < cost) break;

          state.coins -= cost;
          totalSpent += cost;

          tower.level = nextLevel;
          tower.damage = nextLevelDef.damage;
          tower.range = nextLevelDef.range;
          tower.fireRate = nextLevelDef.fireRate;
          tower.totalInvested += cost;
          break;
        }

        case 'sell': {
          if (action.targetTowerInstanceId == null) break;

          const towerIndex = state.towers.findIndex(
            (t) => t.id === action.targetTowerInstanceId,
          );
          if (towerIndex === -1) break;

          const tower = state.towers[towerIndex]!;
          const refund = Math.floor(
            tower.totalInvested * GAME_CONSTANTS.SELL_REFUND_RATE,
          );
          state.coins += refund;
          totalSpent -= refund; // selling gives money back

          state.towers.splice(towerIndex, 1);
          break;
        }

        case 'none':
          break;
      }
    }

    return totalSpent;
  }

  private isValidPlacement(
    state: SimState,
    gridX: number,
    gridY: number,
  ): boolean {
    // Check bounds
    if (
      gridX < 0 ||
      gridX >= GAME_CONSTANTS.GRID_COLS ||
      gridY < 0 ||
      gridY >= GAME_CONSTANTS.GRID_ROWS
    ) {
      return false;
    }

    // Check restricted rows (enemy path)
    if (GAME_CONSTANTS.RESTRICTED_ROWS.includes(gridY)) {
      return false;
    }

    // Check not already occupied
    const occupied = state.towers.some(
      (t) => t.gridX === gridX && t.gridY === gridY,
    );
    return !occupied;
  }
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
