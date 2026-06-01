import type { GameRenderer } from "@/lib/renderer/GameRenderer";
import type { ShooterGameSpec } from "@/lib/spec/types";

import { buildShooterWorld } from "./world";

type PhaserModule = typeof import("phaser");
type PhaserGame = InstanceType<PhaserModule["Game"]>;
type ArcadeRectangle = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.Body;
};

export class ShooterRenderer implements GameRenderer<ShooterGameSpec> {
  private container: HTMLElement | null = null;
  private game: PhaserGame | null = null;
  private spec: ShooterGameSpec | null = null;
  private mountToken = 0;

  mount(container: HTMLElement, spec: ShooterGameSpec): void {
    this.container = container;
    this.spec = spec;
    const token = ++this.mountToken;

    void this.mountAsync(container, spec, token);
  }

  update(spec: ShooterGameSpec): void {
    if (!this.container) {
      return;
    }

    this.destroyGame();
    this.mount(this.container, spec);
  }

  destroy(): void {
    this.mountToken += 1;
    this.destroyGame();
    this.container = null;
    this.spec = null;
  }

  async snapshot(): Promise<Blob> {
    const canvas = this.game?.canvas ?? this.container?.querySelector("canvas");

    if (!canvas) {
      return new Blob([], { type: "image/png" });
    }

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob ?? new Blob([], { type: "image/png" }));
      }, "image/png");
    });
  }

  private async mountAsync(
    container: HTMLElement,
    spec: ShooterGameSpec,
    token: number,
  ): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const Phaser = await import("phaser");

    if (token !== this.mountToken || this.container !== container || this.spec !== spec) {
      return;
    }

    this.destroyGame();
    container.replaceChildren();

    const world = buildShooterWorld(spec);
    const viewportWidth = Math.min(960, Math.max(640, world.width));
    const viewportHeight = Math.min(540, Math.max(360, world.height));

    const createShooterScene = () => {
      return class ShooterScene extends Phaser.Scene {
        private player?: ArcadeRectangle;
        private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        private keys?: Record<string, Phaser.Input.Keyboard.Key>;
        private enemies?: Phaser.Physics.Arcade.Group;
        private projectiles?: Phaser.Physics.Arcade.Group;
        private statusText?: Phaser.GameObjects.Text;
        private health = world.playerHealth;
        private score = 0;
        private finished = false;
        private lastDirection = new Phaser.Math.Vector2(1, 0);

        constructor() {
          super("shooter");
        }

        create(): void {
          this.cameras.main.setBackgroundColor(world.colors.background);
          this.physics.world.setBounds(0, 0, world.width, world.height);

          const bounds = this.add
            .rectangle(world.width / 2, world.height / 2, world.width, world.height)
            .setStrokeStyle(4, world.colors.primary, 0.35);
          bounds.setDepth(-1);

          const playerRect = this.add.rectangle(
            world.width / 2,
            world.height / 2,
            34,
            34,
            world.colors.accent,
          );
          this.physics.add.existing(playerRect);
          this.player = playerRect as unknown as ArcadeRectangle;
          this.player.body.setCollideWorldBounds(true);
          this.player.body.setSize(34, 34);

          this.enemies = this.physics.add.group();
          this.projectiles = this.physics.add.group();

          for (const enemy of world.enemies) {
            this.spawnEnemy(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width, enemy.height);
          }

          const spawners = this.physics.add.staticGroup();
          for (const spawner of world.spawners) {
            const marker = this.add
              .rectangle(
                spawner.x + spawner.width / 2,
                spawner.y + spawner.height / 2,
                spawner.width,
                spawner.height,
                world.colors.primary,
                0.72,
              )
              .setStrokeStyle(2, world.colors.danger, 0.8);
            spawners.add(marker);
            this.time.addEvent({
              delay: world.spawnIntervalMs,
              loop: true,
              callback: () => {
                if (!this.finished) {
                  this.spawnEnemy(marker.x, marker.y, 32, 32);
                }
              },
            });
          }
          spawners.refresh();

          const pickups = this.physics.add.staticGroup();
          for (const pickup of world.pickups) {
            const pickupRect = this.add.rectangle(
              pickup.x + pickup.width / 2,
              pickup.y + pickup.height / 2,
              pickup.width,
              pickup.height,
              world.colors.primary,
            );
            pickups.add(pickupRect);
          }
          pickups.refresh();

          this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
            projectile.destroy();
            enemy.destroy();
            this.score += 100;
            this.updateHud();
            if (this.score >= world.scoreTarget) {
              this.finish("Score reached");
            }
          });

          this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
            if (this.finished) {
              return;
            }
            enemy.destroy();
            this.health -= 1;
            this.updateHud();
            if (this.health <= 0) {
              this.finish("Game over");
            }
          });

          this.physics.add.overlap(this.player, pickups, (_player, pickup) => {
            pickup.destroy();
            this.health = Math.min(world.playerHealth + 2, this.health + 1);
            this.score += 50;
            this.updateHud();
          });

          this.cursors = this.input.keyboard?.createCursorKeys();
          this.keys = this.input.keyboard?.addKeys("W,A,S,D,SPACE") as Record<
            string,
            Phaser.Input.Keyboard.Key
          >;

          this.cameras.main.setBounds(0, 0, world.width, world.height);
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

          this.statusText = this.add
            .text(16, 16, "", {
              fontFamily: "Arial, sans-serif",
              fontSize: "16px",
              color: "#ffffff",
              backgroundColor: "rgba(0,0,0,0.45)",
              padding: { x: 8, y: 6 },
            })
            .setScrollFactor(0)
            .setDepth(10);
          this.updateHud();
        }

        update(): void {
          if (!this.player || this.finished) {
            return;
          }

          const xAxis = Number(this.cursors?.right.isDown || this.keys?.D.isDown) -
            Number(this.cursors?.left.isDown || this.keys?.A.isDown);
          const yAxis = Number(this.cursors?.down.isDown || this.keys?.S.isDown) -
            Number(this.cursors?.up.isDown || this.keys?.W.isDown);
          const movement = new Phaser.Math.Vector2(xAxis, yAxis);

          if (movement.lengthSq() > 0) {
            movement.normalize();
            this.lastDirection.copy(movement);
          }

          this.player.body.setVelocity(movement.x * world.playerSpeed, movement.y * world.playerSpeed);

          const firePressed =
            !!this.cursors?.space &&
            Phaser.Input.Keyboard.JustDown(this.cursors.space);
          const keyFirePressed =
            !!this.keys?.SPACE &&
            Phaser.Input.Keyboard.JustDown(this.keys.SPACE);

          if (firePressed || keyFirePressed) {
            this.fireProjectile();
          }

          this.enemies?.children.each((child) => {
            const enemy = child as ArcadeRectangle;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player?.x ?? enemy.x, this.player?.y ?? enemy.y);
            enemy.body.setVelocity(Math.cos(angle) * world.enemySpeed, Math.sin(angle) * world.enemySpeed);
            return true;
          });
        }

        private spawnEnemy(x: number, y: number, width: number, height: number): void {
          const enemy = this.add.rectangle(x, y, width, height, world.colors.danger);
          this.physics.add.existing(enemy);
          const body = (enemy as unknown as ArcadeRectangle).body;
          body.setCollideWorldBounds(true);
          body.setSize(width, height);
          this.enemies?.add(enemy);
        }

        private fireProjectile(): void {
          if (!this.player) {
            return;
          }

          const projectile = this.add.rectangle(
            this.player.x + this.lastDirection.x * 28,
            this.player.y + this.lastDirection.y * 28,
            14,
            14,
            world.colors.primary,
          );
          this.physics.add.existing(projectile);
          const body = (projectile as unknown as ArcadeRectangle).body;
          body.setVelocity(
            this.lastDirection.x * world.projectileSpeed,
            this.lastDirection.y * world.projectileSpeed,
          );
          body.setSize(14, 14);
          body.setCollideWorldBounds(false);
          this.projectiles?.add(projectile);
          this.time.delayedCall(1100, () => projectile.destroy());
        }

        private updateHud(): void {
          this.statusText?.setText(`Health ${this.health}  Score ${this.score}/${world.scoreTarget}`);
        }

        private finish(message: string): void {
          this.finished = true;
          this.player?.body.setVelocity(0, 0);
          this.enemies?.children.each((enemy) => {
            (enemy as ArcadeRectangle).body.setVelocity(0, 0);
            return true;
          });
          this.statusText?.setText(`${message}  Score ${this.score}/${world.scoreTarget}`);
        }
      };
    };

    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: viewportWidth,
      height: viewportHeight,
      backgroundColor: spec.theme.palette[0],
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0, x: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: createShooterScene(),
    });
  }

  private destroyGame(): void {
    if (!this.game) {
      return;
    }

    this.game.destroy(true);
    this.game = null;
  }
}

export function createShooterRenderer(): GameRenderer<ShooterGameSpec> {
  return new ShooterRenderer();
}
