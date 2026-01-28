import { Container, Graphics } from 'pixi.js';

export class HealthBarRenderer {
  private readonly WIDTH = 40;
  private readonly HEIGHT = 5;
  private readonly OFFSET_Y = -30;
  private readonly BG_COLOR = 0xff0000;
  private readonly FG_COLOR = 0x00ff00;

  createHealthBar(): Container {
    const container = new Container();

    // Background (red)
    const bg = new Graphics();
    bg.rect(0, 0, this.WIDTH, this.HEIGHT);
    bg.fill({ color: this.BG_COLOR });

    // Foreground (green)
    const fg = new Graphics();
    fg.rect(0, 0, this.WIDTH, this.HEIGHT);
    fg.fill({ color: this.FG_COLOR });

    container.addChild(bg, fg);
    container.position.set(-this.WIDTH / 2, this.OFFSET_Y);

    return container;
  }

  updateHealthBar(
    healthBar: Container,
    currentHealth: number,
    maxHealth: number
  ): void {
    const fg = healthBar.children[1];
    if (!fg) return;

    const ratio = Math.max(0, Math.min(1, currentHealth / maxHealth));
    fg.scale.x = ratio;
  }
}
