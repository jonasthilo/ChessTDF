import type { Enemy, Projectile, StatusEffect } from '../../types';
import { useGameStore } from '../../state/gameStore';
import { distance } from '../../utils/math';

export class CollisionSystem {
  private readonly HIT_THRESHOLD = 10; // pixels

  update(): void {
    const state = useGameStore.getState();
    const projectiles = [...state.projectiles]; // Copy to avoid mutation during iteration
    const enemies = state.enemies;

    for (const projectile of projectiles) {
      const target = enemies.find((e) => e.id === projectile.targetId && !e.isDead);
      if (!target) {
        // Target gone, remove projectile
        state.removeProjectile(projectile.id);
        continue;
      }

      // Check collision with current target
      const dist = distance(projectile.x, projectile.y, target.x, target.y);
      if (dist < this.HIT_THRESHOLD) {
        this.handleHit(projectile, target, state);
      }
    }
  }

  private handleHit(
    projectile: Projectile,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    switch (projectile.attackType) {
      case 'single':
      case 'multi':
        this.handleSingleHit(projectile, target, state);
        break;

      case 'pierce':
        this.handlePierceHit(projectile, target, state);
        break;

      case 'splash':
        this.handleSplashHit(projectile, target, state);
        break;

      case 'chain':
        this.handleChainHit(projectile, target, state);
        break;

      default:
        // Fallback to single hit
        this.handleSingleHit(projectile, target, state);
    }
  }

  private handleSingleHit(
    projectile: Projectile,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    this.applyDamage(projectile, target, state);
    this.applyStatusEffect(projectile, target, state);
    state.removeProjectile(projectile.id);
  }

  private handlePierceHit(
    projectile: Projectile,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    // Apply damage and effect to current target
    this.applyDamage(projectile, target, state);
    this.applyStatusEffect(projectile, target, state);

    // Track this hit
    const newHitEnemyIds = [...projectile.hitEnemyIds, target.id];
    const newPierceRemaining = projectile.pierceRemaining - 1;

    if (newPierceRemaining <= 0) {
      // No more pierce, remove projectile
      state.removeProjectile(projectile.id);
      return;
    }

    // Find next target in line (continue in same direction)
    const nextTarget = this.findNextPierceTarget(projectile, newHitEnemyIds, state);

    if (nextTarget) {
      // Update projectile to target next enemy
      state.updateProjectile(projectile.id, {
        targetId: nextTarget.id,
        hitEnemyIds: newHitEnemyIds,
        pierceRemaining: newPierceRemaining,
      });
    } else {
      // No more targets, remove projectile
      state.removeProjectile(projectile.id);
    }
  }

  private handleSplashHit(
    projectile: Projectile,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    // Always hit the primary target
    this.applyDamage(projectile, target, state);
    this.applyStatusEffect(projectile, target, state);

    // Check for splash damage to nearby enemies
    if (projectile.splashRadius > 0) {
      const enemies = state.enemies.filter((e) => !e.isDead && e.id !== target.id);

      for (const enemy of enemies) {
        const dist = distance(target.x, target.y, enemy.x, enemy.y);
        if (dist <= projectile.splashRadius) {
          // Roll for splash chance (splashChance is 0-100)
          if (Math.random() * 100 < projectile.splashChance) {
            this.applyDamage(projectile, enemy, state);
            this.applyStatusEffect(projectile, enemy, state);
          }
        }
      }
    }

    state.removeProjectile(projectile.id);
  }

  private handleChainHit(
    projectile: Projectile,
    target: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    // Apply damage and effect to current target
    this.applyDamage(projectile, target, state);
    this.applyStatusEffect(projectile, target, state);

    // Track this hit
    const newHitEnemyIds = [...projectile.hitEnemyIds, target.id];
    const newChainRemaining = projectile.chainRemaining - 1;

    if (newChainRemaining <= 0) {
      // No more chains, remove projectile
      state.removeProjectile(projectile.id);
      return;
    }

    // Find next chain target (nearest enemy not already hit)
    const nextTarget = this.findNextChainTarget(target, newHitEnemyIds, state);

    if (nextTarget) {
      // Update projectile to chain to next enemy
      state.updateProjectile(projectile.id, {
        targetId: nextTarget.id,
        hitEnemyIds: newHitEnemyIds,
        chainRemaining: newChainRemaining,
        // Reset position to current target (chain jumps)
        x: target.x,
        y: target.y,
      });
    } else {
      // No more targets to chain to, remove projectile
      state.removeProjectile(projectile.id);
    }
  }

  private applyDamage(
    projectile: Projectile,
    enemy: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    // Check for mark effect (increases damage taken)
    let damageMultiplier = 1;
    const markEffect = enemy.statusEffects.find((e) => e.type === 'mark');
    if (markEffect) {
      damageMultiplier = 1 + markEffect.strength / 100; // e.g., 20% mark = 1.2x damage
    }

    const damage = projectile.damage * damageMultiplier;
    const newHealth = enemy.health - damage;

    if (newHealth <= 0) {
      // Enemy died
      if (state.selectedEnemy?.id === enemy.id) {
        state.selectEnemy(null);
      }
      state.removeEnemy(enemy.id);
      state.addCoinsFromBackend(enemy.scaledReward ?? enemy.definition.reward);
      state.incrementEnemiesKilled();
      state.incrementWaveEnemiesDealt();
    } else {
      state.updateEnemy(enemy.id, { health: newHealth });
    }
  }

  private applyStatusEffect(
    projectile: Projectile,
    enemy: Enemy,
    state: ReturnType<typeof useGameStore.getState>
  ): void {
    if (projectile.statusEffect === 'none' || projectile.effectDuration <= 0) {
      return;
    }

    // Check if enemy still exists (might have died from damage)
    const currentEnemy = state.enemies.find((e) => e.id === enemy.id);
    if (!currentEnemy || currentEnemy.isDead) {
      return;
    }

    // Find existing effect of same type from same source
    const existingIndex = currentEnemy.statusEffects.findIndex(
      (e) => e.type === projectile.statusEffect && e.sourceId === projectile.sourceTowerId
    );

    const newEffect: StatusEffect = {
      type: projectile.statusEffect,
      duration: projectile.effectDuration,
      strength: projectile.effectStrength,
      sourceId: projectile.sourceTowerId,
    };

    let updatedEffects: StatusEffect[];

    if (existingIndex >= 0) {
      // Refresh duration (non-stacking, same source refreshes)
      updatedEffects = [...currentEnemy.statusEffects];
      updatedEffects[existingIndex] = newEffect;
    } else {
      // Add new effect
      updatedEffects = [...currentEnemy.statusEffects, newEffect];
    }

    state.updateEnemy(enemy.id, { statusEffects: updatedEffects });
  }

  private findNextPierceTarget(
    projectile: Projectile,
    hitEnemyIds: string[],
    state: ReturnType<typeof useGameStore.getState>
  ): Enemy | null {
    // Find enemies not yet hit, prioritize those ahead in the projectile's path
    const enemies = state.enemies.filter((e) => !e.isDead && !hitEnemyIds.includes(e.id));

    if (enemies.length === 0) return null;

    // Pierce continues forward (higher X = further along path)
    // Find enemies ahead of current position
    const aheadEnemies = enemies.filter((e) => e.x > projectile.x);

    if (aheadEnemies.length > 0) {
      // Target nearest enemy ahead
      return aheadEnemies.reduce((nearest, e) => (e.x < nearest.x ? e : nearest));
    }

    // If no enemies ahead, target nearest overall
    return enemies.reduce((nearest, e) =>
      distance(projectile.x, projectile.y, e.x, e.y) <
      distance(projectile.x, projectile.y, nearest.x, nearest.y)
        ? e
        : nearest
    );
  }

  private findNextChainTarget(
    fromEnemy: Enemy,
    hitEnemyIds: string[],
    state: ReturnType<typeof useGameStore.getState>
  ): Enemy | null {
    // Chain to nearest enemy not yet hit
    const enemies = state.enemies.filter((e) => !e.isDead && !hitEnemyIds.includes(e.id));

    if (enemies.length === 0) return null;

    // Find nearest enemy to chain to
    return enemies.reduce((nearest, e) =>
      distance(fromEnemy.x, fromEnemy.y, e.x, e.y) <
      distance(fromEnemy.x, fromEnemy.y, nearest.x, nearest.y)
        ? e
        : nearest
    );
  }
}
